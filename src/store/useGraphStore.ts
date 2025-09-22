import { create } from 'zustand';

export const useGraphStore = create((set) => ({ nodes: [], edges: [], setNodes: (nodes:any)=>set({nodes}), setEdges:(edges:any)=>set({edges}) }));
