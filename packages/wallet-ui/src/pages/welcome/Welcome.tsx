import React from "react";
import { RouteComponentProps } from "react-router-dom";
import { FormButton } from "../../components/form";
import { RoutePath } from "../../types";
import "./Welcome.scss";

const Welcome: React.FC<RouteComponentProps> = ({ history }) => {
  return (
    <section className="section fill">
      <h1 className="f-heading centered">
        Welcome{" "}
        <span role="img" aria-label="hand waving">
          👋
        </span>
      </h1>
      <h3 className="f-subheading centered">What is Counterfactual?</h3>
      <div className="copy">
        <p>
          Counterfactual is an open-source project comprised of several
          components:
        </p>
        <ul>
          <li>A library for off-chain applications</li>
          <li>An intuitive generalized state channels protocol</li>
          <li>A set of Ethereum smart contracts</li>
        </ul>
        <p>
          It enables developers to build trustless distributed applications with
          minimal overhead. Watch{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://youtu.be/tfKtLNlPL2w?t=72"
          >
            our recent talk at EthCC
          </a>{" "}
          for more.
        </p>
      </div>
      <FormButton onClick={() => history.push(RoutePath.SetupRegister)}>
        Setup Counterfactual
      </FormButton>
    </section>
  );
};

export default Welcome;
