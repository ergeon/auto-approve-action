import { Commit, File } from "./github";

type RenamedFiles = {
  [key: string]: string;
};

export type CommitFiles = {
  added: Set<string>;
  modified: Set<string>;
  removed: Set<string>;
  renamed: RenamedFiles;
};

const FILE_PROCESSORS = {
  added: (file: File, allFiles: CommitFiles) => {
    allFiles.added.add(file.filename);
    allFiles.removed.delete(file.filename);
  },
  modified: (file: File, allFiles: CommitFiles) => {
    if (!allFiles.added.has(file.filename)) {
      allFiles.modified.add(file.filename);
    }
  },
  removed: (file: File, allFiles: CommitFiles) => {
    if (!allFiles.added.has(file.filename)) {
      allFiles.removed.add(file.filename);
    }

    allFiles.added.delete(file.filename);
    allFiles.modified.delete(file.filename);

    for (const renamedFile in allFiles.renamed) {
      if (
        allFiles.renamed.hasOwnProperty(renamedFile) &&
        allFiles.renamed[renamedFile] === file.filename
      ) {
        delete allFiles.renamed[renamedFile];
      }
    }
  },
  renamed: (file: File, allFiles: CommitFiles) => {
    if (allFiles.added.delete(file.previous_filename)) {
      allFiles.added.add(file.filename);
    }

    if (allFiles.modified.delete(file.previous_filename)) {
      allFiles.modified.add(file.filename);
    }

    allFiles.renamed[file.previous_filename] = file.filename;

    for (const renamedFile in allFiles.renamed) {
      if (
        allFiles.renamed.hasOwnProperty(renamedFile) &&
        allFiles.renamed[renamedFile] === file.previous_filename
      ) {
        allFiles.renamed[renamedFile] = file.filename;
        delete allFiles.renamed[file.previous_filename];
      }
    }
  }
};

export const getCommitFiles = (commits: Commit[]): CommitFiles => {
  const allFiles = {
    added: new Set<string>(),
    modified: new Set<string>(),
    removed: new Set<string>(),
    renamed: {}
  };

  for (const commit of commits) {
    for (const file of commit.files) {
      const processor = FILE_PROCESSORS[file.status];

      if (processor) {
        processor(file, allFiles);
      }
    }
  }

  return allFiles;
};

export const compareSets = (set1: Set<string>, set2: Set<string>): boolean => {
  if (set1.size !== set2.size) {
    return false;
  }

  for (const item of set1) {
    if (!set2.has(item)) {
      return false;
    }
  }

  return true;
};

export class MutableSet<T> extends Set<T> {
  protected _hasChanged: boolean;

  constructor(objects: Array<T>) {
    super(objects);
    this._hasChanged = false;
  }

  delete(value: T): boolean {
    this._hasChanged = true;
    return super.delete(value);
  }

  hasChanged(): boolean {
    return this._hasChanged;
  }

  isEmpty(): boolean {
    return this.size == 0;
  }
}
