/**
 * @typedef {Object} BookmarkNode
 * @property {string} id
 * @property {string|null} parentId
 * @property {string} title
 * @property {string} [url]
 * @property {number} [dateAdded]
 * @property {number} [dateGroupModified]
 * @property {BookmarkNode[]} [children]
 * @property {boolean} [isFolder]
 */

export const NodeType = { FOLDER: 'folder', BOOKMARK: 'bookmark' };

export function nodeType(node) {
  return node.url ? NodeType.BOOKMARK : NodeType.FOLDER;
}

export function isFolder(node) {
  return !node.url;
}

export function cloneNode(node) {
  return JSON.parse(JSON.stringify(node));
}
