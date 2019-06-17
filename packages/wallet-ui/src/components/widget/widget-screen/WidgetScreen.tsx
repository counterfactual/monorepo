import React from "react";
import { Link } from "react-router-dom";
import { WidgetLogo } from "../widget-logo/WidgetLogo";
import { WidgetCard } from "../widget-card/WidgetCard";
import { WidgetHeader } from "../widget-header/WidgetHeader";

export type WidgetScreenProps = {
  exitable?: boolean;
  children?: React.ReactNode;
  header?: React.ReactNode;
  post?: React.ReactNode;
};

const WidgetScreen: React.FC = ({
  exitable,
  children,
  header,
  post
}: WidgetScreenProps) => (
  <div className="widget-screen">
    <div className="constraint">
      <div className="pre">
        {exitable ? (
          <Link to="/">
            <button className="close">
              <img alt="Close" src="/assets/icon/close.svg" />
            </button>
          </Link>
        ) : null}
      </div>
      <WidgetCard>
        <div className="logo">
          <WidgetLogo caption="Wallet" />
        </div>
        <WidgetHeader>{header}</WidgetHeader>
        {children}
      </WidgetCard>
      <div className="post">{post}</div>
    </div>
  </div>
);

export { WidgetScreen };
