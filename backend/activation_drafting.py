"""Contexto mínimo y seguro para redactar activaciones en HACERLO.

No transporta nombres/correos de personas, tablas de audiencia, respuestas
individuales ni claves privadas a proveedores de IA.
"""
import json
import re
from typing import Any


def compact(value: Any, limit: int = 240) -> str:
    value = "" if value is None else str(value)
    # Eliminar correos, URLs y números extensos en los textos diagnósticos.
    value = re.sub(r"\b[^\s@]+@[^\s@]+\.[^\s@]+\b", "[correo omitido]", value)
    value = re.sub(r"https?://\S+", "[enlace omitido]", value)
    value = re.sub(r"\b\d{7,}\b", "[identificador omitido]", value)
    return " ".join(value.split())[:limit]


def activation_context(state: dict, action_index: int, kind: str,
                       stage: str, audience_ids: list, draft: dict) -> dict:
    """Arma un resumen sin personas identificables para un mensaje editado por un humano."""
    actions = state.get("actions") or []
    if not isinstance(actions, list) or not 0 <= action_index < len(actions):
        raise ValueError("La intervención no existe o cambió.")
    action = actions[action_index]
    if not isinstance(action, dict):
        raise ValueError("Intervención no válida.")
    available_audiences = state.get("audiences") or []
    selected = []
    selected_ids = set(map(str, audience_ids[:20]))
    for aud in available_audiences if isinstance(available_audiences, list) else []:
        if not isinstance(aud, dict) or str(aud.get("id")) not in selected_ids:
            continue
        selected.append({
            "grupo": compact(aud.get("name"), 90),
            "barreras": compact(aud.get("barriers") or aud.get("specificImpact"), 200),
            "rol": compact(aud.get("changeRole"), 75),
            "impacto": compact(aud.get("impact"), 65),
        })
        if len(selected) >= 5:
            break

    behaviors = state.get("behaviors") or []
    action_behavior_ids = set(map(str, [
        action.get("behaviorId"), *(action.get("behaviorIds") or [])
    ]))
    linked = [
        {"id": compact(b.get("id"), 70), "objetivo": compact(b.get("name"), 240),
         "criterio": compact(b.get("adoptionCriteria"), 190)}
        for b in behaviors if isinstance(b, dict)
        and str(b.get("id")) in action_behavior_ids
    ][:3]
    # Si no hay enlace, mostrar solamente el comportamiento global:
    # no inventar una asociación a otro comportamiento distinto.
    result = state.get("objective") or state.get("expected") or ""
    if isinstance(result, dict):
        result = result.get("text") or result.get("name") or result.get("description") or ""
    findings = []
    for item in state.get("diagnosisFindings") or []:
        if not isinstance(item, dict):
            continue
        role = compact(item.get("role"), 60)
        body = compact(item.get("text") or item.get("title"), 240)
        if body:
            findings.append({"tipo": role, "hallazgo": body})
        if len(findings) >= 4:
            break
    barriers = []
    raw_factors = state.get("behaviorDiagnosis") or {}
    for factor in (raw_factors.values() if isinstance(raw_factors, dict) else raw_factors):
        if not isinstance(factor, dict):
            continue
        label = compact(factor.get("factor"), 140)
        if label:
            barriers.append({
                "factor": label, "rol": compact(factor.get("role"), 60),
                "dimension": compact(factor.get("dimension"), 75)
            })
        if len(barriers) >= 4:
            break

    result = {
        "intervencion": {
            "nombre": compact(action.get("name") or action.get("title"), 160),
            "descripcion": compact(action.get("description"), 360),
            "hipotesis": compact(action.get("hypothesis"), 280),
        },
        "resultado_esperado": compact(result, 180),
        "comportamientos_vinculados": linked,
        "audiencias_seleccionadas": selected,
        "hallazgos_relevantes": findings,
        "factores": barriers,
        "momento": stage,
        "mecanismo": kind,
        "borrador_existente": {
            "asunto": compact(draft.get("subject"), 120),
            "mensaje": compact(draft.get("message"), 950),
            "accion": compact(draft.get("cta"), 220),
        },
    }
    return result


def activation_sources(context: dict) -> dict:
    return {
        "audiencias": len(context["audiencias_seleccionadas"]),
        "comportamientos": len(context["comportamientos_vinculados"]),
        "hallazgos": len(context["hallazgos_relevantes"]),
        "factores": len(context["factores"]),
    }


def decode_activation_reply(reply: Any) -> dict:
    """Interpreta solo un objeto JSON con tres campos editables y su justificación."""
    if isinstance(reply, list):
        reply = "\n".join(str(p.get("text") or p.get("content") or "")
                          if isinstance(p, dict) else str(p)
                          for p in reply)
    if not isinstance(reply, str):
        raise ValueError("La IA no entregó texto.")
    cleaned = reply.strip()
    match = re.fullmatch(r"\`\`\`(?:json)?\s*(.*?)\s*\`\`\`", cleaned, flags=re.I | re.S)
    if match:
        cleaned = match.group(1).strip()
    try:
        parsed = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if not match:
            raise ValueError("La IA no entregó una propuesta estructurada.")
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise ValueError("La IA no entregó un objeto JSON válido.") from exc

    if not isinstance(parsed, dict):
        raise ValueError("La IA no entregó un objeto de propuesta.")
    subject = compact(parsed.get("subject"), 140)
    message = str(parsed.get("message") or "").strip()[:2400]
    cta = compact(parsed.get("cta"), 450)
    reason = compact(parsed.get("reason"), 230)
    if not subject or not message or not cta:
        raise ValueError("La propuesta de IA está incompleta.")
    if len(message) < 30:
        raise ValueError("La IA entregó una propuesta demasiado corta.")
    return {"subject": subject, "message": message, "cta": cta, "reason": reason}
