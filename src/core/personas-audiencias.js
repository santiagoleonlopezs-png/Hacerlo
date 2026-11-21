function audPersonAudienceIds(person) {
 const ids = [person?.audienceId, ...(person?.additionalAudienceIds || [])];
 return [...new Set(ids.filter(Boolean).map(String))];
}
function audPersonAudienceLabel(x, person) {
 const ids = audPersonAudienceIds(person);
 return (x.audiences || []).filter(a => ids.includes(String(a.id))).map(a => a.name).join(', ') || 'Sin audiencia';
}
