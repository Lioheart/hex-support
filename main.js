// Warning when missing the lib-wrapper module
Hooks.once("ready", () => {
  if (!game.modules.get("lib-wrapper")?.active && game.user.isGM) ui.notifications.error("Hex Grid Support requires the 'libWrapper' module. Please install and activate it.")
});

Hooks.once("init", () => {
  // Module setting registration
  game.settings.register("hex-support", "circleHex", {
    name: "hex-support.CircleHexName",
    hint: "hex-support.CircleHexHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      const {templates, grid} = game.scenes.current;
      if (grid.type >= 2) {
        for (const temp of templates) {
          if (temp.t === "circle") temp._object.refresh();
        }
      }
    }
  });
  game.settings.register("hex-support", "coneHex", {
    name: "hex-support.ConeHexName",
    hint: "hex-support.ConeHexHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      const {templates, grid} = game.scenes.current;
      if (grid.type >= 2) {
        for (const temp of templates) {
          if (temp.t === "cone") temp._object.refresh();
        }
      }
    }
  });
  game.settings.register("hex-support", "angleOverride", {
    name: "hex-support.AngleOverrideName",
    hint: "hex-support.AngleOverrideHint",
    scope: "client",
    config: true,
    type: Number,
    default: 60
  });

  // Override the default angle for cones in scenes with a hex grid
  Object.defineProperty(CONFIG.MeasuredTemplate.defaults, "angle", {
    get: function() {return game.scenes.current.grid.type >= 2 ? game.settings.get("hex-support", "angleOverride") : 53.13}
  });

  // Change circle and cone measured templates to a hexagonal shape
  libWrapper.register("hex-support", "MeasuredTemplate.prototype._computeShape", function(wrapped) {
    const result = wrapped();
    const {angle: direction, distance} = this.ray;
    const gridType = game.scenes.current.grid.type;
    if (gridType >= 2) {
      switch (this.document.t) {
        case "circle":
          if (!game.settings.get("hex-support", "circleHex")) break;
          return this.constructor.getHexShape(direction, distance);
        case "cone":
          if (!game.settings.get("hex-support", "coneHex")) break;
          return this.constructor.getHexConeShape(direction, this.document.angle, distance, gridType >= 4);
      }
    }
    return result;
  }, "WRAPPER");

  /**
   * Get a Hexagonal area of effect given a direction and distance
   * @param {number} direction
   * @param {number} distance
   * @returns {PIXI.Polygon}
   */
  MeasuredTemplate.getHexShape = function(direction, distance) {
    const points = Array.fromRange(6)
      .map(a => Ray.fromAngle(0, 0, Math.PI/3 * a + direction, distance+1))
      .reduce((arr, r) =>  arr.concat(r.B.x, r.B.y), []);
    return new PIXI.Polygon(points);
  }

  /**
   * Get a Conical area of effect where the end points are shaped to a hexagon given direction, angle, distance, and if it's shaped to rows or columns
   * @param {number} direction
   * @param {number} angle
   * @param {number} distance
   * @param {boolean} column
   * @returns {PIXI.Polygon}
   */
  MeasuredTemplate.getHexConeShape = function(direction, angle, distance, column) {
    const sqrt3 = Math.sqrt(3);
    const thirdPI = Math.PI/3;

    // Calculate the required angles
    const angles = [direction + Math.toRadians(angle/-2)];
    const endAngle = direction + Math.toRadians(angle/2);
    for (let i = (column ? Math.round : Math.ceil)((angles[0]+Number.EPSILON) / thirdPI) * thirdPI + (column ? thirdPI/2 : 0); i < endAngle; i += thirdPI) {
      angles.push(i);
    }
    angles.push(endAngle);

    // Get the cone shape as a polygon
    const points = angles.map(a => {
      const distanceSolveAngle = Math.abs((a + (column ? thirdPI/2 : 0)) % thirdPI);
      return Ray.fromAngle(0, 0, a, (sqrt3*distance) / (sqrt3*Math.cos(distanceSolveAngle)+Math.sin(distanceSolveAngle)) +1);
    })
    .reduce((arr, r) => arr.concat([r.B.x, r.B.y]), [0, 0]);
    return new PIXI.Polygon(points);
  }
});

// If the circleHex setting is enabled, change the icon for circle templates to a hexagon
Hooks.on("getSceneControlButtons", (controls) => {
  if (game.settings.get("hex-support", "circleHex") && game.scenes.current.grid.type >= 2) {
    const circleTool = controls.find((group) => group.name === "measure").tools.find((shape) => shape.name === "circle");
    circleTool.title = "hex-support.MeasureHex";
    circleTool.icon = "fa-regular fa-hexagon";
    // TODO: create a demonstration video
    // circleTool.toolclip.src = "assets/measure-hexagon.webm";
    circleTool.toolclip.heading = "hex-support.MeasureHex";
    circleTool.toolclip.items.push({ heading: "CONTROLS.CommonRotate", content: "CONTROLS.ShiftOrCtrlScroll" });
  }
});
