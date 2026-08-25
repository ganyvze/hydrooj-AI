// Minimal type declarations for the runtime-provided ui-default module
// (resolved to window.HydroExports by ui-default's esbuild federation plugin).
declare module '@hydrooj/ui-default' {
    type PageCallback = (pagename: string, loadPage: (name: string) => Promise<any>) => any;
    export class Page {
        name: string | string[];
        constructor(pagename: string | string[], afterLoading?: PageCallback, beforeLoading?: PageCallback);
    }
    export class NamedPage extends Page {}
}
