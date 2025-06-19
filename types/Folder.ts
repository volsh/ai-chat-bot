export interface Folder {
  id: string;
  name: string;
  emoji: string;
  color: string;
  parent_id: string | null;
  user_id: string;
  shared_with?: string[];
}

export interface FolderNode extends Folder {
  children: FolderNode[];
}
