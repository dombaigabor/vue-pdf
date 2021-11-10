import {RenderTask, getDocument, AnnotationLayer, RenderingCancelledException, PasswordResponses, GlobalWorkerOptions} from "pdfjs-dist";
import {PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy} from "pdfjs-dist/types/src/display/api";
//Because importing the typed version is always failing.
//@ts-ignore
import {PDFLinkService} from "pdfjs-dist/lib/web/pdf_link_service";
//@ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

export default class PdfJsWrapper {
    private canvasElt: HTMLCanvasElement;
    private annotationLayerElt: HTMLSpanElement;
    private emitEvent: any;

    private pdfDoc: undefined | PDFDocumentProxy | null;
    private pdfPage: PDFPageProxy | undefined | null = null;
    private pdfRender: RenderTask | undefined | null = null;
    private canceling = false;

    private pendingOperation: Promise<any> = Promise.resolve();

    constructor(canvasElt: HTMLCanvasElement, annotationLayerElt: HTMLSpanElement, emitEvent: any) {
        this.canvasElt = canvasElt;
        this.annotationLayerElt = annotationLayerElt;
        this.emitEvent = emitEvent;

        canvasElt?.getContext('2d')?.save();
        annotationLayerElt.style.transformOrigin = '0 0';
        
        GlobalWorkerOptions.workerSrc = pdfjsWorker;
    }

    public isPDFDocumentLoadingTask(obj: any) {
        return typeof (obj) === 'object' && obj !== null && obj.__PDFDocumentLoadingTask === true;
    }

    public createLoadingTask(src: any, options: any) {
        let source;
        if (typeof (src) === 'string') {
            source = {url: src};
        } else if (src instanceof Uint8Array) {
            source = {data: src};
        } else if (typeof (src) === 'object' && src !== null) {
            source = Object.assign({}, src);
        } else {
            throw new TypeError('invalid src type');
        }
        

        if (options && options.withCredentials) {
            source.withCredentials = options.withCredentials;
        }

        let loadingTask;
        try {
            loadingTask = getDocument(source);
            //@ts-ignore
            loadingTask.__PDFDocumentLoadingTask = true;

            if (options && options.onPassword) {
                loadingTask.onPassword = options.onPassword;
            }

            if (options && options.onProgress) {
                loadingTask.onProgress = options.onProgress;
            }
            return loadingTask;
        }
        catch (err) {
            console.error(err)
        }
    }

    private clearCanvas() {
        this.canvasElt.getContext('2d')?.clearRect(0, 0, this.canvasElt.width, this.canvasElt.height);
    }

    private clearAnnotations() {
        while (this.annotationLayerElt.firstChild) {
            this.annotationLayerElt.removeChild(this.annotationLayerElt.firstChild);
        }
    }

    public destroy() {
        if (!this.pdfDoc) {
            return;
        }

        // Aborts all network requests and destroys worker.
        this.pendingOperation = this.pdfDoc.destroy();
        this.pdfDoc = null;
    }

    public getResolutionScale() {
        return this.canvasElt.offsetWidth / this.canvasElt.width;
    }

    public printPage(dpi: any, pageNumberOnly: any) {
        if (this.pdfPage === null)
            return;

        const PRINT_RESOLUTION = dpi === undefined ? 150 : dpi;
        const PRINT_UNITS = PRINT_RESOLUTION / 72.0;
        const CSS_UNITS = 96.0 / 72.0;

        const iframeElt = document.createElement('iframe');

        const removeIframe = () => {
            if (iframeElt && iframeElt.parentNode) {
                iframeElt.parentNode.removeChild(iframeElt);
            }
        }

        new Promise<Window | null>((resolve) => {
            iframeElt.frameBorder = '0';
            iframeElt.scrolling = 'no';
            iframeElt.width = '0px;'
            iframeElt.height = '0px;'
            iframeElt.style.cssText = 'position: absolute; top: 0; left: 0';

            iframeElt.onload = () => {
                resolve(iframeElt.contentWindow);
            }

            window.document.body.appendChild(iframeElt);
        })
            .then((win) => {
                if (win) {
                    win.document.title = '';

                    return this.pdfDoc?.getPage(1)
                        .then((page) => {

                            const viewport = page.getViewport({scale: 1});
                            win.document.head.appendChild(win.document.createElement('style')).textContent =
                                '@supports ((size:A4) and (size:1pt 1pt)) {' +
                                '@page { margin: 1pt; size: ' + ((viewport.width * PRINT_UNITS) / CSS_UNITS) + 'pt ' + ((viewport.height * PRINT_UNITS) / CSS_UNITS) + 'pt; }' +
                                '}' +

                                '@media print {' +
                                'body { margin: 0 }' +
                                'canvas { page-break-before: avoid; page-break-after: always; page-break-inside: avoid }' +
                                '}' +

                                '@media screen {' +
                                'body { margin: 0 }' +
                                '}' +

                                ''
                            return win;
                        })
                }
            })
            .then((win) => {
                if (win) {
                    const allPages = [];

                    if (this.pdfDoc?.numPages) {
                        for (let pageNumber = 1; pageNumber <= this.pdfDoc?.numPages; ++pageNumber) {

                            if (pageNumberOnly !== undefined && pageNumberOnly.indexOf(pageNumber) === -1) {
                                continue;
                            }

                            allPages.push(
                                this.pdfDoc?.getPage(pageNumber)
                                    .then((page) => {
                                        const viewport = page.getViewport({scale: 1});

                                        const printCanvasElt = win.document.body.appendChild(win.document.createElement('canvas'));
                                        printCanvasElt.width = (viewport.width * PRINT_UNITS);
                                        printCanvasElt.height = (viewport.height * PRINT_UNITS);

                                        return page.render({
                                            canvasContext: printCanvasElt.getContext('2d')!,
                                            transform: [ // Additional transform, applied just before viewport transform.
                                                PRINT_UNITS, 0, 0,
                                                PRINT_UNITS, 0, 0
                                            ],
                                            viewport: viewport,
                                            intent: 'print'
                                        }).promise;
                                    })
                            );
                        }
                    }

                    Promise.all(allPages)
                        .then(function () {

                            win.focus(); // Required for IE
                            if (win.document.queryCommandSupported('print')) {
                                win.document.execCommand('print', false, undefined);
                            } else {
                                win.print();
                            }
                            removeIframe();
                        })
                        .catch((err) => {
                            removeIframe();
                            this.emitEvent('error', err);
                        })
                }
            })
    }

    public renderPage(rotate: any) {
        if (this.pdfRender !== null) {
            if (this.canceling) {
                return;
            }
            this.canceling = true;
            this.pdfRender?.cancel();
            return;
        }

        if (!this.pdfPage) {
            return;
        }

        const pageRotate = (this.pdfPage?.rotate === undefined ? 0 : this.pdfPage.rotate) + (rotate === undefined ? 0 : rotate);

        const scale = this.canvasElt.offsetWidth / this.pdfPage?.getViewport({scale: 1}).width * (window.devicePixelRatio || 1);
        const viewport = this.pdfPage.getViewport({scale: scale, rotation: pageRotate});

        this.emitEvent('page-size', viewport.width, viewport.height, scale);

        this.canvasElt.width = viewport.width;
        this.canvasElt.height = viewport.height;

        this.pdfRender = this.pdfPage?.render({
            canvasContext: this.canvasElt.getContext('2d')!,
            viewport: viewport
        });

        this.annotationLayerElt.style.visibility = 'hidden';
        this.clearAnnotations();

        const viewer = {
            scrollPageIntoView: (params: any) => {
                this.emitEvent('link-clicked', params.pageNumber)
            },
        };

        const linkService = new PDFLinkService();
        linkService.setDocument(this.pdfDoc);
        linkService.setViewer(viewer);

        this.pendingOperation = this.pendingOperation.then(() => {
            const getAnnotationsOperation =
                this.pdfPage?.getAnnotations({intent: 'display'})
                    .then((annotations: any[]) => {
                        AnnotationLayer.render({
                            viewport: viewport.clone({dontFlip: true}),
                            div: this.annotationLayerElt as HTMLDivElement,
                            annotations: annotations,
                            page: this.pdfPage,
                            linkService: linkService,
                            renderForms: false,
                            downloadManager: null
                        });
                    });

            const pdfRenderOperation =
                this.pdfRender?.promise
                    .then(() => {
                        this.annotationLayerElt.style.visibility = '';
                        this.canceling = false;
                        this.pdfRender = null;
                    })
                    .catch((err: any) => {
                        this.pdfRender = null;
                        if (err instanceof RenderingCancelledException) {
                            this.canceling = false;
                            this.renderPage(rotate);
                            return;
                        }
                        this.emitEvent('error', err);
                    });

            return Promise.all([getAnnotationsOperation, pdfRenderOperation]);
        });
    }

    public forEachPage(pageCallback: any) {
        if (!this.pdfDoc) {
            return;
        }

        const numPages = this.pdfDoc.numPages;
        let self = this;
        (function next(pageNum) {
            self.pdfDoc?.getPage(pageNum)
                .then(pageCallback)
                .then(function () {

                    if (++pageNum <= numPages)
                        next(pageNum);
                })
        })(1);
    }

    public loadPage(pageNumber: any, rotate: any) {
        this.pdfPage = null;

        if (!this.pdfDoc) {
            return;
        }

        this.pendingOperation = this.pendingOperation.then(() => {
            return this.pdfDoc?.getPage(pageNumber);
        })
            .then((page) => {
                if (page) {
                    this.pdfPage = page;
                    this.renderPage(rotate);
                    this.emitEvent('page-loaded', page.pageNumber);
                }
            })
            .catch((err) => {
                this.clearCanvas();
                this.clearAnnotations();
                this.emitEvent('error', err);
            });
    }

    public loadDocument(src: any) {
        this.pdfDoc = null;
        this.pdfPage = null;

        this.emitEvent('num-pages', undefined);

        if (!src) {
            this.canvasElt.removeAttribute('width');
            this.canvasElt.removeAttribute('height');
            this.clearAnnotations();
            return;
        }

        // wait for pending operation ends
        this.pendingOperation = this.pendingOperation.then(() => {
            let loadingTask: PDFDocumentLoadingTask | undefined;
            if (this.isPDFDocumentLoadingTask(src)) {
                if (src.destroyed) {
                    this.emitEvent('error', new Error('loadingTask has been destroyed'));
                    return
                }
                loadingTask = src;
            } else {
                loadingTask = this.createLoadingTask(src, {
                    onPassword: (updatePassword: any, reason: any) => {
                        let reasonStr;
                        switch (reason) {
                            case PasswordResponses.NEED_PASSWORD:
                                reasonStr = 'NEED_PASSWORD';
                                break;
                            case PasswordResponses.INCORRECT_PASSWORD:
                                reasonStr = 'INCORRECT_PASSWORD';
                                break;
                        }
                        this.emitEvent('password', updatePassword, reasonStr);
                    },
                    onProgress: (status: any) => {
                        const ratio = status.loaded / status.total;
                        this.emitEvent('progress', Math.min(ratio, 1));
                    }
                });
            }

            return loadingTask?.promise;
        })
            .then((pdf) => {
                if (pdf) {
                    this.pdfDoc = pdf;
                    this.emitEvent('num-pages', pdf.numPages);
                    this.emitEvent('loaded');
                }
            })
            .catch((err) => {
                console.error(err)
                this.clearCanvas();
                this.clearAnnotations();
                this.emitEvent('error', err);
            })
    }
}
