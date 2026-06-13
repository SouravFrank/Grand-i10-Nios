declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.png' {
  const source: number;
  export default source;
}

declare module '*.jpg' {
  const source: number;
  export default source;
}

declare module '*.pdf' {
  const source: number;
  export default source;
}
