document.addEventListener("DOMContentLoaded", () => {
  const numbersWrapper = document.getElementById("numbersWrapper");

  function generateCells() {
    numbersWrapper.innerHTML = "";

    const baseCellSize = 50;
    document
      .querySelector(":root")
      .style.setProperty("--cellSize", baseCellSize + "px");

    const numCols = Math.floor(window.innerWidth / baseCellSize);
    const leftover = window.innerWidth % baseCellSize;
    const cellSize = baseCellSize + leftover / numCols;

    const numRows = Math.ceil(window.innerHeight / cellSize);
    const totalCells = numCols * numRows;

    for (let i = 0; i < totalCells; i++) {
      const outerDiv = document.createElement("div");
      const div = document.createElement("div");
      div.innerHTML = Math.floor(Math.random() * 10);
      div.classList.add("selectable");
      outerDiv.classList.add("selectableWrapper");
      outerDiv.style.animationName = Math.random() < 0.5 ? "drift1" : "drift2";
      outerDiv.style.animationDuration =
        Math.floor(Math.random() * 15) + 3 + "s";

      outerDiv.appendChild(div);
      numbersWrapper.appendChild(outerDiv);
    }
  }

  generateCells();

  function createSelectableIntersectData() {
    const selectables = [];
    const selectableElems = [...document.querySelectorAll(".selectable")];

    for (const selectable of selectableElems) {
      const { x, y, width, height } = selectable.getBoundingClientRect();
      selectables.push({
        x: x + window.scrollX,
        y: y + window.scrollY,
        width,
        height,
        elem: selectable,
      });
      selectable.dataset.info = JSON.stringify({ x, y, width, height });
    }

    return selectables;
  }

  let selectables = createSelectableIntersectData();

  window.addEventListener("resize", () => {
    generateCells();
    selectables = createSelectableIntersectData();
  });

  let selectedElements = [];

  // Check if mouse is over any selectable element
  function checkSelected(x, y) {
    // Iterate through all selectable elements
    for (const selectable of selectables) {
      const rect = selectable.elem.getBoundingClientRect();
      const { left, top, width, height } = rect;

      if (x >= left && x <= left + width && y >= top && y <= top + height) {
        selectable.elem.classList.add("intersected");
        if (!selectedElements.includes(selectable)) {
          selectable.elem.classList.add("intersected");
          selectedElements.push(selectable);
        }
      }
    }
  }

  function onPointerDown(event) {
    event.preventDefault();

    // Reset previous selections
    selectables.forEach((item) => item.elem.classList.remove("intersected"));
    selectedElements = [];
    numbersWrapper.addEventListener("pointermove", onPointerMove);
    numbersWrapper.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(event) {
    const x = event.pageX;
    const y = event.pageY;
    checkSelected(x, y);
  }

  function onPointerUp() {
    numbersWrapper.removeEventListener("pointermove", onPointerMove);
    numbersWrapper.removeEventListener("pointerup", onPointerUp);
  }

  numbersWrapper.addEventListener("pointerdown", onPointerDown);

  const buckets = document.querySelectorAll(".bucket");

  function handleBucketDrop(event) {
    event.preventDefault();

    const { width, height, left, top } = event.target.getBoundingClientRect();

    const y = event.clientY - 100;
    const x = event.clientX;

    // const y = top + height / 2;
    // const x = left + width / 2;

    console.log(event.target.getBoundingClientRect());

    document.querySelectorAll(".intersected").forEach((element) => {
      if (element) {
        element.style.position = "absolute";

        // element.style.transform = `translate(${x}px,${y}px)`;

        element.style.left = x + "px";
        element.style.top = y + "px";
      }
    });
  }

  buckets.forEach((bucket) => {
    bucket.addEventListener("click", handleBucketDrop);
  });
});
