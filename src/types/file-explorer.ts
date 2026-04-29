export type FileExplorerNodeType = 'file' | 'directory'

export interface FileTreeNode {
  relative_path: string
  name: string
  node_type: FileExplorerNodeType
  depth: number
  has_children?: boolean
  extension?: string
}

export interface FileTreeResponse {
  root: string
  nodes: FileTreeNode[]
}

export interface FileSearchResult {
  relative_path: string
  name: string
  node_type: FileExplorerNodeType
}
