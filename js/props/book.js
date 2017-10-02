
export function props() {
  // const props = {
  //   height,
  //   width,
  //   gravity,
  //   injector,
  //   cachedPages,
  //   renderInactivePages,
  //   renderWhileFlipping,
  //   pagesForPredicting,
  //   preloadPages,
  //   sheet: {
  //     startVelocity,
  //     cornerDeviation,
  //     flexibility,
  //     flexibleCorner,
  //     bending,
  //     wave,
  //     shape,
  //     widthTexels,
  //     heightTexels,
  //     color,
  //     sideTexture
  //   },
  //   cover: {
  //     ...sheet,
  //     padding,
  //     binderTexture,
  //     depth,
  //     mass
  //   },
  //   page: {
  //     ...sheet,
  //     depth,
  //     mass
  //   }
  // };

  return {
    height: 0.297,
    width: 0.21,
    gravity: 1,
    cachedPages: 50,
    renderInactivePages: true,
    renderWhileFlipping: false,
    pagesForPredicting: 5,
    preloadPages: 5,
    sheet: {
      startVelocity: 0.8,
      cornerDeviation: 0.25,
      flexibility: 10,
      flexibleCorner: 0.5,
      bending: 11,
      wave: 0.5,
      shape: 0,
      widthTexels: 5*210,
      heightTexels: 5*297,
      color: 0xFFFFFF
    },
    cover: {
      binderTexture: '',
      depth: 0.0003,
      padding: 0,
      mass: 0.003
    },
    page: {
      depth: 0.0001,
      mass: 0.001
    }
  };
};
