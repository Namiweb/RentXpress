export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export function extractDataFromDataUrl(dataUrl) {
  if (!dataUrl) {
    return { data: undefined, contentType: undefined };
  }
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (match) {
    return { contentType: match[1], data: match[2] };
  }
  return { data: dataUrl, contentType: undefined };
}