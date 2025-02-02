document.addEventListener("DOMContentLoaded", () => {
  const mainEl = document.querySelector("main").getBoundingClientRect();
  const winModal = document.querySelector("#winModal");
  const startModal = document.querySelector("#startModal");
  const startButton = document.querySelector("#startButton");
  const playAgainBtn = winModal.querySelector("button");

  startModal.showModal();

  playAgainBtn.addEventListener("click", playAgain);

  winModal.addEventListener("click", (e) => {
    const dialogDimensions = winModal.getBoundingClientRect();

    if (
      e.clientX < dialogDimensions.left ||
      e.clientX > dialogDimensions.right ||
      e.clientY < dialogDimensions.top ||
      e.clientY > dialogDimensions.bottom
    ) {
      playAgain();
    }
  });

  let start = false;
  let width = mainEl.width;
  let height = mainEl.height;
  let svg, simulation;
  let cols, rows;
  let mouseX = null;
  let mouseY = null;

  let mouseMagnetismDist = 150;
  let mouseMagnetStrength = 0.01;
  let cellSize = 50;
  let isDragging = false;
  let selectedNodes = [];
  let dragOffset = { x: 0, y: 0 };
  let initialPositions = [];

  let dropBox, dropBoxText, completedText;
  const boxWidth = 200;
  const boxHeight = 120;
  let boxPosition = {
    x: width / 2 - boxWidth / 2,
    y: height - boxHeight * 2,
  };

  let badNumbers = [];
  let foundBad = 0;
  let completePercent = 0;
  let firstLoad = true;
  let tooltip, tooltipTimeout;

  function init() {
    // Remove existing elements if any
    d3.selectAll("g.node").remove();
    d3.selectAll("text").remove();
    // playAgainBtn.removeEventListener("click", playAgain);

    // Get new dimensions
    width = mainEl.width;
    height = mainEl.height;

    cols = Math.ceil(width / cellSize);
    rows = Math.ceil(height / cellSize);

    // Set SVG dimensions
    svg = d3
      .select("#numbersSVG")
      // .attr("width", width)
      // .attr("height", height)
      .on("mousemove", function (event) {
        [mouseX, mouseY] = d3.pointer(event);
      })
      .on("mouseleave", function () {
        mouseX = null;
        mouseY = null;
      });

    while (
      badNumbers.length <
      Math.floor((Math.random() * (cols * rows)) / 2) + 20
    ) {
      let rand = Math.floor((Math.random() * (cols * rows)) / 2); // 500 total numbers, change as necessary

      if (!badNumbers.includes(rand)) {
        badNumbers.push(rand);
      }
    }

    // badNumbers = [1, 2];

    // Create nodes
    const nodes = Array.from({ length: cols * rows }, (_, i) => ({
      id: Math.floor(Math.random() * 10),
      radius: 10,
      color: "#bdffff",
      badNumber: badNumbers.includes(i),
      selected: false,
      // x: (i % cols) * (width / cols),
      // y: Math.floor(i / rows) * (height / rows),
      x: Math.random() * width,
      y: Math.random() * height,
      isNew: true,
    }));

    // Create or update simulation
    if (!simulation) {
      simulation = d3
        .forceSimulation(nodes)
        .force(
          "charge",
          d3.forceManyBody().strength(-0.05) // Increased repulsion
        )
        .force(
          "collision",
          d3
            .forceCollide()
            .radius((d) => d.radius + 5)
            .iterations(4)
        )
        // .alphaDecay(0.01)
        .alphaMin(0)
        .velocityDecay(0.2)
        .on("tick", ticked);
    } else {
      simulation
        .nodes(nodes)
        .force("center", d3.forceCenter(width / 2, height / 2))
        .alpha(1)
        .restart();
    }

    dropBox = svg
      .append("rect")
      .attr("class", "drop-box")
      .attr("x", boxPosition.x)
      .attr("y", boxPosition.y)
      .attr("width", boxWidth)
      .attr("height", boxHeight)
      .style("fill", "#ffffff50")
      .style("stroke", "#333")
      .style("stroke-width", 2)
      .style("rx", 5);

    dropBoxText = svg
      .append("text")
      .attr("dy", "0.3em")
      .attr("x", boxPosition.x + boxWidth / 2)
      .attr("y", boxPosition.y + boxHeight / 2)
      .attr("font-size", "1.5rem")
      .style("text-anchor", "middle")
      .style("user-select", "none")
      .style("pointer-events", "none")
      .style("fill", "white")
      .attr("opacity", 0)
      .text("Drop here");

    completedText = svg
      .append("text")
      .attr("dy", "0.3em")
      .attr("x", boxPosition.x + boxWidth / 2)
      .attr("y", boxPosition.y + boxHeight / 2)
      .attr("font-size", "1.5rem")
      .style("text-anchor", "middle")
      .style("user-select", "none")
      .style("pointer-events", "none")
      .style("fill", "white")
      .attr("opacity", 1)
      .text(`${completePercent}% complete`);

    // Create node elements
    const node = svg
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node");

    node
      .append("text")
      .attr("dy", "0.3em")
      .attr("font-size", "1.5rem")
      .style("text-anchor", "middle")
      .style("user-select", "none")
      .style("fill", (d) => d.color)
      .text((d) => d.id);

    // Handle window resize
    window.addEventListener("resize", handleResize);

    if (start) {
      startGame();
    }
  }

  function startGame() {
    start = true;
    simulation.force("mouseAttraction", () => {
      if (mouseX === null || mouseY === null || isDragging || isInBox()) return;

      simulation.nodes().forEach((d) => {
        if (d.badNumber) {
          const dx = mouseX - d.x;
          const dy = mouseY - d.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < mouseMagnetismDist) {
            const strength =
              mouseMagnetStrength * (1 - distance / mouseMagnetismDist);
            d.vx += dx * strength;
            d.vy += dy * strength;
            d.selected = true;
          } else {
            d.selected = false;
          }
        }
      });
    });

    svg
      .on("mousedown", onMouseDown)
      .on("touchstart", onMouseDown) // Add touchstart
      .on("mousemove", onMouseMove)
      .on("mouseup", onMouseUp);

    dropBox
      .on("mouseover", function () {
        d3.select(this).transition().duration(300).style("fill", "#ffffff80");
      })
      .on("mouseout", function () {
        d3.select(this).transition().duration(300).style("fill", "#ffffff50");
      });
  }

  function onMouseDown(event) {
    event.preventDefault();
    dropBoxText.transition().duration(300).attr("opacity", 1);
    completedText.transition().duration(300).attr("opacity", 0);
    isDragging = true;
    [mouseX, mouseY] = d3.pointer(event);
    selectedNodes = simulation.nodes().filter((d) => d.selected);

    if (selectedNodes.length > 0) {
      simulation.alphaTarget(0).restart(); // Pause simulation

      // Store initial positions relative to mouse
      initialPositions = selectedNodes.map((d) => ({
        node: d,
        offsetX: d.x - mouseX,
        offsetY: d.y - mouseY,
      }));
    }
  }

  function onMouseUp(event) {
    event.preventDefault();
    [mouseX, mouseY] = d3.pointer(event);

    dropBoxText.transition().duration(300).attr("opacity", 0);
    completedText.transition().duration(300).attr("opacity", 1);

    if (!isDragging) return;

    isDragging = false;

    if (isInBox()) {
      // Remove selected nodes
      svg
        .selectAll(".node")
        .filter((d) => d.selected)
        .transition()
        .duration(300)
        .style("opacity", 0)
        .on("end", function (d) {
          // Remove from simulation after animation
          simulation.nodes(simulation.nodes().filter((n) => n !== d));
        });

      foundBad += selectedNodes.length;
      completePercent = (foundBad / badNumbers.length) * 100;

      dropBoxText.transition().duration(300).attr("opacity", 0);

      completedText
        .text(`${Math.ceil(completePercent)}% complete`)
        .transition()
        .duration(300)
        .attr("opacity", 1);

      if (completePercent === 100) {
        winModal.showModal();
      }
    }

    selectedNodes = [];
    initialPositions = [];

    // If mouse left SVG, replace nodes
    if (event.type === "mouseleave") {
      simulation.nodes().forEach((d) => {
        if (d.selected) {
          d.x = Math.random() * width;
          d.y = Math.random() * height;
        }
      });
    }

    // Resume simulation
    simulation.restart();
  }

  function onMouseMove(event) {
    event.preventDefault();

    [mouseX, mouseY] = d3.pointer(event);

    if (!isDragging) return;

    // Update positions while maintaining relative offsets
    initialPositions.forEach(({ node, offsetX, offsetY }) => {
      node.x = mouseX + offsetX;
      node.y = mouseY + offsetY;

      // Keep within bounds
      node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
      node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
    });

    // Update visualization
    svg
      .selectAll(".node")
      .filter((d) => selectedNodes.includes(d))
      .attr("transform", (d) => `translate(${d.x},${d.y})`);
  }

  function isInBox() {
    const overBox =
      mouseX > boxPosition.x &&
      mouseX < boxPosition.x + boxWidth &&
      mouseY > boxPosition.y &&
      mouseY < boxPosition.y + boxHeight;

    return overBox;
  }

  function ticked() {
    // Keep nodes within visible area
    simulation.nodes().forEach((d) => {
      d.x = Math.max(d.radius, Math.min(width - d.radius, d.x));
      d.y = Math.max(d.radius, Math.min(height - d.radius * 6, d.y));

      // Box boundaries (expanded by node radius)
      const boxLeft = boxPosition.x - d.radius;
      const boxRight = boxPosition.x + boxWidth + d.radius;
      const boxTop = boxPosition.y - d.radius;
      const boxBottom = boxPosition.y + boxHeight + d.radius;

      // Check if node is overlapping with box area
      const overlapX = d.x > boxLeft && d.x < boxRight;
      const overlapY = d.y > boxTop && d.y < boxBottom;

      // if (overlapX && overlapY && !d.selected) {
      //   // Calculate distances to box edges
      //   const distLeft = d.x - boxLeft;
      //   const distRight = boxRight - d.x;
      //   const distTop = d.y - boxTop;
      //   const distBottom = boxBottom - d.y;

      //   // Find closest edge to push out to
      //   const minX = Math.min(distLeft, distRight);
      //   const minY = Math.min(distTop, distBottom);

      //   if (minX < minY) {
      //     // Push to left or right
      //     d.x =
      //       distLeft < distRight
      //         ? boxPosition.x - d.radius * 2
      //         : boxPosition.x + boxWidth + d.radius * 2;
      //   } else {
      //     // Push to top or bottom
      //     d.y =
      //       distTop < distBottom
      //         ? boxPosition.y - d.radius * 2
      //         : boxPosition.y + boxHeight + d.radius * 2;
      //   }

      //   // Re-clamp to screen boundaries after adjustment
      //   d.x = Math.max(d.radius, Math.min(width - d.radius, d.x));
      //   d.y = Math.max(d.radius, Math.min(height - d.radius, d.y));
      // }
    });

    function distanceIntensity(d) {
      const dx = mouseX - d.x;
      const dy = mouseY - d.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 200;

      // Calculate color intensity based on distance
      const intensity = Math.max(0, 1 - distance / maxDistance);

      return intensity;
    }

    // Update positions and colors
    if (!isDragging) {
      svg
        .selectAll(".node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .select("text")
        .style("transform", (d) => {
          // Apply scaling only to selected badNumbers
          if (d.selected && d.badNumber) {
            const intensity = distanceIntensity(d);
            return `scale(${intensity + 1})`;
          } else {
            return "scale(1)";
          }
        });
    }

    svg.selectAll(".node").attr("transform", (d) => `translate(${d.x},${d.y})`);
  }

  function handleResize() {
    // Update dimensions and restart simulation
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width).attr("height", height);

    simulation
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alpha(1)
      .restart();
  }

  function playAgain() {
    winModal.close();
    foundBad = 0;
    completePercent = 0;
    isDragging = false;
    init();
  }

  document
    .querySelector("#resetButton")
    .addEventListener("click", () => init());

  init();

  startButton.addEventListener("click", () => {
    startGame();
  });
});
