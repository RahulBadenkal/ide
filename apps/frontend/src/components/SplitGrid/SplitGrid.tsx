import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import Split from "split-grid";

export function SplitGrid(props) {
  const [gridTemplateColumns, setGridTemplateColumns] = createSignal(props.gridTemplateColumns || null);
  const [gridTemplateRows, setGridTemplateRows] = createSignal(props.gridTemplateRows || null);
  let splitInstance;

  const writeStyle = (element, gridTemplateProp, style) => {
    if (gridTemplateProp === "grid-template-columns") {
      setGridTemplateColumns(style);
    } else if (gridTemplateProp === "grid-template-rows") {
      setGridTemplateRows(style);
    }
  };

  const onDrag = (direction, track, style) => {
    if (props.onDrag) {
      props.onDrag(direction, track, style);
    }
  };

  const getGridProps = () => {
    const style = {};
    if (gridTemplateColumns()) {
      style.gridTemplateColumns = gridTemplateColumns();
    }
    if (gridTemplateRows()) {
      style.gridTemplateRows = gridTemplateRows();
    }
    return { style };
  };

  const getGutterProps = (direction, track) => ({
    onMouseDown: handleDragStart(direction, track),
    onTouchStart: handleDragStart(direction, track),
  });

  const handleDragStart = (direction, track) => (e) => {
    splitInstance.handleDragStart(e, direction, track);
  };

  createEffect(() => {
    const {
      children,
      columnMinSizes,
      rowMinSizes,
      columnMaxSizes,
      rowMaxSizes,
      ...options
    } = props;

    options.writeStyle = writeStyle;
    options.onDrag = onDrag;

    if (splitInstance) {
      splitInstance.destroy(false);
    }

    splitInstance = Split({
      columnMinSizes,
      rowMinSizes,
      columnMaxSizes,
      rowMaxSizes,
      ...options,
    });
  });

  onMount(() => {
    const { children, ...options } = props;
    options.writeStyle = writeStyle;
    options.onDrag = onDrag;
    splitInstance = Split(options);
  });

  onCleanup(() => {
    splitInstance.destroy();
  });

  return props.component
    ? props.component({ getGridProps, getGutterProps })
    : props.render
    ? props.render({ getGridProps, getGutterProps })
    : typeof props.children === "function"
    ? props.children({ getGridProps, getGutterProps })
    : props.children;
}

SplitGrid.defaultProps = {
  component: undefined,
  render: undefined,
  children: undefined,
  gridTemplateColumns: undefined,
  gridTemplateRows: undefined,
  columnMinSizes: undefined,
  rowMinSizes: undefined,
  columnMaxSizes: undefined,
  rowMaxSizes: undefined,
  onDrag: undefined,
};
