import networkx as nx


def analyze_network(nodes, edges):
    """
    Analiza una red dirigida de HACERLO.
    nodes: [{"id": "...", "label": "...", "type": "..."}]
    edges: [{"source": "...", "target": "...", "intensity": 1}]
    """

    graph = nx.DiGraph()

    for node in nodes:
        node_id = str(node["id"])
        attributes = {k: v for k, v in node.items() if k != "id"}
        graph.add_node(node_id, **attributes)

    for edge in edges:
        source = str(edge["source"])
        target = str(edge["target"])
        intensity = float(edge.get("intensity", 1))

        graph.add_edge(
            source,
            target,
            weight=intensity
        )

    number_of_nodes = graph.number_of_nodes()
    number_of_edges = graph.number_of_edges()

    if number_of_nodes == 0:
        return {
            "nodes": 0,
            "edges": 0,
            "density": 0,
            "metrics": []
        }

    degree_centrality = nx.degree_centrality(graph)
    in_degree_centrality = nx.in_degree_centrality(graph)
    out_degree_centrality = nx.out_degree_centrality(graph)
    betweenness = nx.betweenness_centrality(graph)

    metrics = []

    for node_id in graph.nodes:
        metrics.append({
            "id": node_id,
            "degree_centrality": round(degree_centrality.get(node_id, 0), 4),
            "in_degree_centrality": round(
                in_degree_centrality.get(node_id, 0), 4
            ),
            "out_degree_centrality": round(
                out_degree_centrality.get(node_id, 0), 4
            ),
            "betweenness_centrality": round(
                betweenness.get(node_id, 0), 4
            )
        })

    return {
        "nodes": number_of_nodes,
        "edges": number_of_edges,
        "density": round(nx.density(graph), 4),
        "metrics": metrics
    }
