import networkx as nx
import asyncio
import re
from llm_router import router

async def execute_dag(nodes: list[dict], edges: list[dict]) -> dict:
    """
    Executes a Directed Acyclic Graph (DAG) of prompts.
    Parallelizes execution of independent nodes using asyncio.gather.
    """
    G = nx.DiGraph()
    node_map = {node['id']: node for node in nodes}
    
    # Build the graph
    for node in nodes:
        G.add_node(node['id'])
    for edge in edges:
        G.add_edge(edge['source'], edge['target'])
        
    # Verify if the graph is a DAG
    if not nx.is_directed_acyclic_graph(G):
        raise ValueError("The provided graph contains cycles and cannot be executed.")
        
    node_outputs = {}
    node_tasks = {} # Map node_id to a Future/Task that resolves to its output
    
    async def get_node_output(node_id: str):
        # If already computing/computed, return the task
        if node_id in node_tasks:
            return await node_tasks[node_id]
            
        # Create the task
        task = asyncio.create_task(_execute_single_node(node_id))
        node_tasks[node_id] = task
        return await task

    async def _execute_single_node(node_id: str):
        node = node_map[node_id]
        node_type = node.get('type')
        data = node.get('data', {})
        
        if node_type == 'inputNode':
            val = data.get('value', '')
            node_outputs[node_id] = val
            return val
            
        elif node_type == 'llmNode':
            prompt = data.get('prompt', '')
            model = data.get('model', 'nemotron-120b')
            
            # Find dependencies
            incoming_edges = list(G.in_edges(node_id))
            
            # Wait for all parent outputs in parallel
            parent_results = await asyncio.gather(*[get_node_output(source) for source, _ in incoming_edges])
            
            # Replace placeholders
            for (source, _), result in zip(incoming_edges, parent_results):
                pattern = re.compile(r'\{\s*' + re.escape(source) + r'\s*\}')
                prompt = pattern.sub(str(result), prompt)
                    
            messages = [{"role": "user", "content": prompt}]
            
            # Native async LLM call
            response = await router.get_completion(model_key=model, messages=messages)
            
            output = f"Error: {response['error']}" if "error" in response else response.get("content", "")
            node_outputs[node_id] = output
            return output
                
        elif node_type == 'outputNode':
            incoming_edges = list(G.in_edges(node_id))
            # Wait for all parent outputs
            parent_results = await asyncio.gather(*[get_node_output(source) for source, _ in incoming_edges])
            
            outputs = {source: res for (source, _), res in zip(incoming_edges, parent_results)}
            node_outputs[node_id] = outputs
            return outputs
        
        return None

    # Trigger execution of all "leaf" nodes or just find all nodes and trigger
    # Starting from nodes with no outgoing edges (possible final results)
    leaf_nodes = [n for n, d in G.out_degree() if d == 0]
    await asyncio.gather(*[get_node_output(node_id) for node_id in leaf_nodes])
            
    # Find the output node's result specifically for the 'final_result' key
    final_output_node = next((n for n in nodes if n['type'] == 'outputNode'), None)
    final_result = node_outputs.get(final_output_node['id']) if final_output_node else None

    return {
        "final_result": final_result,
        "node_outputs": node_outputs
    }
