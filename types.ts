
export interface MindMapNode {
  id?: string;
  label: string;
  children?: MindMapNode[];
}

export interface TransformationResult {
  originalTranscription: string;
  formalText: string;
  mindMap: MindMapNode;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}
