import React from "react";

import { WidgetLogo } from "../../widget";

const LayoutHeader: React.FC = () => {
  return (
    <header className="header">
      <div className="desktop-wrapper">
        <nav className="header-content">
          <div className="left">
            <div className="top-line">
              <WidgetLogo />
            </div>
            {/* <widget-dev-flags /> */}
          </div>
          {/* <header-account
          onAuthenticationChanged={e => this.updateConnectionWidget(e)}
        /> */}
        </nav>
      </div>
    </header>
  );
};

export { LayoutHeader };
