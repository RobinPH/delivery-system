import { Canvas, CanvasConfig } from "./Canvas";
import EdgeElement from "./elements/Edge/EdgeElement";
import NodeElement from "./elements/Node/NodeElement";

type Node = {
  id: string;
  x: number;
  y: number;
  label?: string;
};

type Edge = {
  source: string;
  target: string;
};

type NetworkGraphCanvasConfig = {
  nodes: Array<Node>;
  edges: Array<Edge>;
};

export default class NetworkGraphCanvas extends Canvas {
  #nodes = new Array<NodeElement>();
  #edges = new Array<EdgeElement>();
  #actionStack = new Array<() => void>();
  #editable = false;

  constructor(
    config: Partial<NetworkGraphCanvasConfig> & Partial<CanvasConfig> = {}
  ) {
    super(config);

    this.setGraph({
      nodes: config.nodes ?? [],
      edges: config.edges ?? [],
    });

    // for (let i = 0; i < 5; i++) {
    //   this.addElement(
    //     ...(config.nodes ?? []).map((node) => {
    //       return new NodeElement({
    //         id: `${node.id}${Math.random()}`,
    //         x: node.x * Math.random(),
    //         y: node.y * Math.random(),
    //         radius: 2,
    //         fill: "yellow",
    //         draggable: true,
    //       });
    //     })
    //   );
    //   this.addElement(
    //     ...(config.edges ?? [])
    //       .map((edge) => {
    //         const source =
    //           this.#nodes[Math.floor(Math.random() * this.#nodes.length)];
    //         const target =
    //           this.#nodes[Math.floor(Math.random() * this.#nodes.length)];

    //         if (source && target) {
    //           return new EdgeElement({
    //             source,
    //             target,
    //           });
    //         } else {
    //           return null;
    //         }
    //       })
    //       .filter((edge) => edge !== null)
    //   );
    // }

    this.initEventListeners();
  }

  setGraph(graph: NetworkGraphCanvasConfig) {
    this.deleteElement(...this.elements.values());

    this.#nodes = (graph.nodes ?? []).map((node) => {
      return new NodeElement({
        id: node.id,
        x: node.x,
        y: node.y,
        label: node.label,
        radius: 2,
        fill: "black",
        draggable: true,
      });
    });

    this.#edges = (graph.edges ?? [])
      .map((edge) => {
        const source = this.#nodes.find((node) => node.id === edge.source);
        const target = this.#nodes.find((node) => node.id === edge.target);

        if (source && target) {
          return new EdgeElement({
            source,
            target,
          });
        } else {
          return null;
        }
      })
      .filter((edge) => edge !== null);

    this.addElement(...this.#nodes);
    this.addElement(...this.#edges);
  }

  initEventListeners() {
    this.on("canvasClick", ({ x, y, previousSelectedElement }) => {
      if (!this.config.editable || true) {
        return;
      }

      const node = new NodeElement({
        x,
        y,
        radius: 2,
        z: 1,
        // fill: "purple",
        draggable: true,
      });

      this.addElement(node);

      this.#nodes.push(node);

      this.#actionStack.push(() => {
        this.deleteElement(node);
        this.#nodes = this.#nodes.filter((n) => n !== node);
      });

      if (
        previousSelectedElement &&
        previousSelectedElement instanceof NodeElement
      ) {
        const edge = new EdgeElement({
          z: 0,
          source: previousSelectedElement,
          target: node,
        });

        this.addElement(edge);
        this.#edges.push(edge);

        this.#actionStack.push(() => {
          this.deleteElement(edge);
          this.#edges = this.#edges.filter((e) => e !== edge);
        });
      }

      this.selectedElement = node;
    });

    this.on("selectElement", ({ element, previousSelectedElement }) => {
      if (
        element &&
        element instanceof NodeElement &&
        previousSelectedElement &&
        previousSelectedElement instanceof NodeElement &&
        element !== previousSelectedElement
      ) {
        const existingEdge = this.#edges.find((edge) => {
          return (
            (edge.config.source === previousSelectedElement &&
              edge.config.target === element) ||
            (edge.config.source === element &&
              edge.config.target === previousSelectedElement)
          );
        });

        if (!existingEdge && this.config.editable) {
          return;
          const edge = new EdgeElement({
            z: 0,
            source: previousSelectedElement,
            target: element,
          });

          this.addElement(edge);
          this.#edges.push(edge);
        }
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.code === "Delete" || event.code === "Backspace") {
        const selectedElement = this.selectedElement;

        if (selectedElement) {
          this.deleteElement(selectedElement);

          if (selectedElement instanceof NodeElement) {
            this.#nodes.splice(this.#nodes.indexOf(selectedElement), 1);
          } else if (selectedElement instanceof EdgeElement) {
            this.#edges.splice(this.#edges.indexOf(selectedElement), 1);
          }
        }
      } else if (event.code === "Escape") {
        this.selectedElement = null;
      } else if (event.code === "KeyZ" && event.ctrlKey) {
        const remove = this.#actionStack.pop();

        if (remove) {
          remove();
        }
      }
    });
  }

  toJSON() {
    const elements = Array.from(this.elements.values());

    const nodes = elements.filter(
      (element) => element instanceof NodeElement
    ) as NodeElement[];
    const edges = elements.filter(
      (element) => element instanceof EdgeElement
    ) as EdgeElement[];

    return {
      nodes: nodes.map((node) => ({
        id: node.id,
        x: node.state.x,
        y: node.state.y,
      })),
      edges: edges.map((edge) => ({
        source: edge.config.source.id,
        target: edge.config.target.id,
      })),
    };
  }

  get nodes() {
    return this.#nodes;
  }

  get edges() {
    return this.#edges;
  }

  static fromJSON(
    data: NetworkGraphCanvasConfig,
    canvasConfig: Partial<CanvasConfig> = {}
  ) {
    return new NetworkGraphCanvas({
      nodes: data.nodes,
      edges: data.edges,
      ...canvasConfig,
    });
  }
}
