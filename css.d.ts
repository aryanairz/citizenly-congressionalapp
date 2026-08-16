// Allow side-effect and module imports of CSS files (global.css, *.module.css).
// Metro/NativeWind handle these at bundle time; this just satisfies TypeScript.
declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
