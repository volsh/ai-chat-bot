// utils/folderUtils.ts
import { FolderNode } from "@/types";

export function flattenTree(tree: FolderNode[], parentId: string | null = null): any[] {
  const flat: any[] = [];

  for (const node of tree) {
    const { children, ...rest } = node;
    flat.push({ ...rest, parent_id: parentId });

    if (children?.length) {
      flat.push(...flattenTree(children, node.id));
    }
  }

  return flat;
}

export const reorderTree = (
  nodes: any[],
  sourceId: string,
  destinationId: string | null
): any[] => {
  const findAndRemove = (arr: any[]): [any | null, any[]] => {
    let found: any = null;
    const newArr = arr.flatMap((node) => {
      if (node.id === sourceId) {
        found = node;
        return [];
      }
      const [childFound, newChildren] = findAndRemove(node.children || []);
      if (childFound) {
        found = childFound;
        return [{ ...node, children: newChildren }];
      }
      return [node];
    });
    return [found, newArr];
  };

  const insertInto = (arr: any[]): any[] => {
    return arr.map((node) => {
      if (node.id === destinationId) {
        return { ...node, children: [...(node.children || []), dragged] };
      }
      return { ...node, children: insertInto(node.children || []) };
    });
  };

  const [dragged, treeWithoutDragged] = findAndRemove(nodes);
  if (!dragged) return nodes;
  if (!destinationId) return [...treeWithoutDragged, dragged];
  return insertInto(treeWithoutDragged);
};
