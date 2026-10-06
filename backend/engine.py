import networkx as nx
from collections import Counter, defaultdict

def _round(v):
    return round(float(v), 4)

def _rank(metric, nodes, limit=5):
    rows = [{"id": n, "label": nodes[n].get("label", n), "value": _round(metric.get(n, 0))} for n in nodes]
    return sorted(rows, key=lambda x: (-x["value"], x["label"]))[:limit]

def _communities(graph, nodes):
    if graph.number_of_nodes() < 3 or graph.number_of_edges() < 2:
        return []
    ug = nx.Graph()
    ug.add_nodes_from(graph.nodes())
    ug.add_edges_from(graph.edges())
    try:
        groups = list(nx.community.greedy_modularity_communities(ug))
    except Exception:
        return []
    return [
        {"size": len(g), "ids": sorted(g), "labels": [nodes[n].get("label", n) for n in sorted(g)]}
        for g in sorted(groups, key=len, reverse=True) if len(g) > 1
    ]

def _layer_analysis(nodes_list, edges, relation_filter=None):
    node_map = {str(n["id"]): n for n in nodes_list}
    g = nx.DiGraph()
    for nid, attrs in node_map.items():
        g.add_node(nid, **{k:v for k,v in attrs.items() if k != "id"})
    selected = [e for e in edges if not relation_filter or e.get("relation") == relation_filter]
    for e in selected:
        s, t = str(e["source"]), str(e["target"])
        if s in g and t in g:
            g.add_edge(s, t)

    n, ecount = g.number_of_nodes(), g.number_of_edges()
    degree = nx.degree_centrality(g) if n > 1 else {x:0 for x in g}
    indeg = nx.in_degree_centrality(g) if n > 1 else {x:0 for x in g}
    outdeg = nx.out_degree_centrality(g) if n > 1 else {x:0 for x in g}
    between = nx.betweenness_centrality(g) if n > 1 else {x:0 for x in g}
    try:
        pr = nx.pagerank(g) if ecount else {x:(1/n if n else 0) for x in g}
    except Exception:
        pr = {x:0 for x in g}
    isolates = list(nx.isolates(g))
    weak = list(nx.weakly_connected_components(g)) if n else []
    reciprocity = nx.reciprocity(g) if ecount else 0
    reciprocity = 0 if reciprocity is None else reciprocity

    metrics = []
    for nid in g.nodes:
        metrics.append({
            "id": nid, "label": node_map[nid].get("label", nid), "type": node_map[nid].get("type", "Otro"),
            "degree_centrality": _round(degree.get(nid,0)),
            "in_degree_centrality": _round(indeg.get(nid,0)),
            "out_degree_centrality": _round(outdeg.get(nid,0)),
            "betweenness_centrality": _round(between.get(nid,0)),
            "pagerank": _round(pr.get(nid,0)),
            "layer_count": 1 if g.degree(nid) else 0
        })

    signals, hypotheses = [], []
    if isolates:
        labels = ", ".join(node_map[i].get("label", i) for i in isolates[:4])
        signals.append(f"{len(isolates)} nodo(s) aislado(s) en esta capa: {labels}.")
        hypotheses.append({"title":"Explorar desconexión estructural","rationale":"Hay nodos sin relaciones registradas en la capa seleccionada.","action":"Verificar si es ausencia real de vínculo, falta de captura o una oportunidad de conexión."})
    if len(weak) > 1 and n > 2:
        signals.append(f"La capa está fragmentada en {len(weak)} componentes débilmente conectados.")
        hypotheses.append({"title":"Explorar puentes entre componentes","rationale":"La red presenta grupos desconectados entre sí.","action":"Examinar si conviene crear mecanismos de conexión, coordinación o intercambio entre grupos."})
    if between and max(between.values(), default=0) > 0:
        bridge = max(between, key=between.get)
        signals.append(f"{node_map[bridge].get('label',bridge)} presenta la mayor intermediación estructural de la capa.")
        hypotheses.append({"title":"Revisar dependencia de puentes","rationale":"Un actor intermedia rutas entre partes de la red.","action":"Contrastar si su ausencia genera cuellos de botella y, si aplica, distribuir conexiones o conocimiento."})
    if indeg and max(indeg.values(), default=0) >= 0.6 and n >= 4:
        hub = max(indeg, key=indeg.get)
        signals.append(f"Las relaciones entrantes muestran concentración alrededor de {node_map[hub].get('label',hub)}.")
        hypotheses.append({"title":"Explorar concentración","rationale":"Una proporción alta de vínculos converge en un mismo nodo.","action":"Validar si la concentración es funcional o representa sobredependencia antes de intervenir."})

    return {
        "mode":"layer",
        "relation_filter": relation_filter,
        "nodes": n, "edges": ecount, "density": _round(nx.density(g)) if n > 1 else 0,
        "summary":{"nodes":n,"edges":ecount,"density":_round(nx.density(g)) if n>1 else 0,
                   "reciprocity":_round(reciprocity),"isolates":len(isolates),
                   "weak_components":len(weak),"strong_components":nx.number_strongly_connected_components(g) if n else 0},
        "metrics":metrics,
        "top_in":_rank(indeg,node_map),"top_out":_rank(outdeg,node_map),
        "top_betweenness":_rank(between,node_map),"top_pagerank":_rank(pr,node_map),
        "communities":_communities(g,node_map),
        "signals":signals,
        "intervention_hypotheses":hypotheses
    }

def _multiplex_analysis(nodes_list, edges):
    node_map = {str(n["id"]): n for n in nodes_list}
    relations = sorted({e.get("relation") or "Otra" for e in edges})
    counts = Counter(e.get("relation") or "Otra" for e in edges)
    total = len(edges)
    composition = [{"relation":r,"edges":counts[r],"share":_round(counts[r]/total) if total else 0} for r in relations]

    node_layers = defaultdict(set)
    in_by_layer = defaultdict(Counter)
    out_by_layer = defaultdict(Counter)
    reciprocal_by_layer = {}
    aggregate = nx.DiGraph()
    aggregate.add_nodes_from(node_map.keys())

    for e in edges:
        s,t = str(e["source"]),str(e["target"])
        r = e.get("relation") or "Otra"
        if s not in node_map or t not in node_map: continue
        aggregate.add_edge(s,t)
        node_layers[s].add(r); node_layers[t].add(r)
        out_by_layer[r][s] += 1; in_by_layer[r][t] += 1

    for r in relations:
        rg = nx.DiGraph()
        rg.add_nodes_from(node_map.keys())
        rg.add_edges_from((str(e["source"]),str(e["target"])) for e in edges if (e.get("relation") or "Otra")==r and str(e["source"]) in node_map and str(e["target"]) in node_map)
        rec = nx.reciprocity(rg) if rg.number_of_edges() else 0
        reciprocal_by_layer[r] = _round(0 if rec is None else rec)

    between = nx.betweenness_centrality(aggregate) if aggregate.number_of_nodes()>1 else {x:0 for x in aggregate}
    try:
        pr = nx.pagerank(aggregate) if aggregate.number_of_edges() else {x:(1/len(node_map) if node_map else 0) for x in node_map}
    except Exception:
        pr = {x:0 for x in node_map}

    metrics, roles = [], []
    for nid,n in node_map.items():
        lc=len(node_layers[nid])
        metrics.append({"id":nid,"label":n.get("label",nid),"type":n.get("type","Otro"),
                        "in_degree_centrality":_round(nx.in_degree_centrality(aggregate).get(nid,0)) if len(node_map)>1 else 0,
                        "out_degree_centrality":_round(nx.out_degree_centrality(aggregate).get(nid,0)) if len(node_map)>1 else 0,
                        "betweenness_centrality":_round(between.get(nid,0)),"pagerank":_round(pr.get(nid,0)),"layer_count":lc})
        tags=[]
        if lc >= max(2, (len(relations)+1)//2): tags.append("Transversal")
        if between.get(nid,0)>0: tags.append("Puente")
        if pr.get(nid,0) >= sorted(pr.values(),reverse=True)[max(0,min(len(pr)-1,len(pr)//4))] if pr else False: tags.append("Prominente")
        if sum(in_by_layer[r][nid] for r in relations)>sum(out_by_layer[r][nid] for r in relations): tags.append("Receptor")
        elif sum(out_by_layer[r][nid] for r in relations)>0: tags.append("Emisor")
        roles.append({"id":nid,"label":n.get("label",nid),"type":n.get("type","Otro"),"layer_count":lc,"roles":tags})
    roles.sort(key=lambda z:(-z["layer_count"], z["label"]))

    matrix=[]
    for nid,n in node_map.items():
        vals={}
        for r in relations:
            i,o=in_by_layer[r][nid],out_by_layer[r][nid]
            vals[r]=(f"↓{i} ↑{o}" if i or o else "")
        matrix.append({"id":nid,"label":n.get("label",nid),"type":n.get("type","Otro"),"layers":vals})

    signals,hypotheses=[],[]
    if relations:
        top=composition[0] if composition else None
        if top: signals.append(f"La red contiene {len(relations)} capa(s); «{max(composition,key=lambda z:z['edges'])['relation']}» es la de mayor volumen.")
    trans=[r for r in roles if r["layer_count"]>=2]
    if trans:
        signals.append(f"{len(trans)} nodo(s) participan en dos o más capas; {trans[0]['label']} tiene la mayor transversalidad.")
        hypotheses.append({"title":"Examinar nodos transversales","rationale":"Algunos nodos participan simultáneamente en varios tipos de relación.","action":"Revisar si esa transversalidad aporta integración o concentra dependencia, diferenciando cada capa."})
    if aggregate.number_of_nodes() and len(list(nx.isolates(aggregate))):
        signals.append(f"{len(list(nx.isolates(aggregate)))} nodo(s) no tienen conexiones en ninguna capa registrada.")
    if between and max(between.values(),default=0)>0:
        bridge=max(between,key=between.get)
        hypotheses.append({"title":"Contrastar rol de puente transversal","rationale":f"{node_map[bridge].get('label',bridge)} conecta partes de la red agregada.","action":"Examinar en qué capas ocurre el puente antes de diseñar una intervención."})

    return {
        "mode":"multiplex",
        "nodes":len(node_map),"edges":total,
        "summary":{"nodes":len(node_map),"edges":total,"layers":len(relations)},
        "layers":relations,
        "relation_composition":composition,
        "reciprocity_by_layer":reciprocal_by_layer,
        "metrics":metrics,
        "structural_roles":roles,
        "layer_matrix":matrix,
        "communities":_communities(aggregate,node_map),
        "signals":signals,
        "intervention_hypotheses":hypotheses
    }

def analyze_network(nodes, edges, mode="layer", relation_filter=None):
    if mode == "multiplex":
        return _multiplex_analysis(nodes, edges)
    return _layer_analysis(nodes, edges, relation_filter)
