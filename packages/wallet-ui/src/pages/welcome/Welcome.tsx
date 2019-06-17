import React from "react";
import { Link } from "react-router-dom";

import { FormButton } from "../../components/form";

const Welcome: React.FC = () => {
  return (
    <section className="section fill">
      <h1>
        Welcome{" "}
        <span role="img" aria-label="hand waving">
          👋
        </span>
      </h1>
      <h3>What is Counterfactual?</h3>
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
      <Link to="register">
        <FormButton>Setup Counterfactual</FormButton>
      </Link>
    </section>
  );
};

export { Welcome };
