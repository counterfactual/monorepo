import { TestWindow } from '@stencil/core/testing';
import { AppLogo } from './app-logo';

describe('app-logo', () => {
  it('should build', () => {
    expect(new AppLogo()).toBeTruthy();
  });

  describe('rendering', () => {
    let element: HTMLAppLogoElement;
    let testWindow: TestWindow;
    beforeEach(async () => {
      testWindow = new TestWindow();
      element = await testWindow.load({
        components: [AppLogo],
        html: '<app-logo></app-logo>'
      });
    });

    // See https://stenciljs.com/docs/unit-testing
    {cursor}

  });
});
