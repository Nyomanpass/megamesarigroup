export const slugifyFilenamePart = (value) => {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");

  return slug || "project";
};

export const getProjectFilenameSuffix = (project) =>
  slugifyFilenamePart(
    project?.nama_import ||
    project?.pekerjaan ||
    project?.kegiatan ||
    project?.id
  );

export const buildExportFilename = (baseName, project, extension) =>
  `${baseName}_${getProjectFilenameSuffix(project)}.${extension}`;
