import { Component } from "@stencil/core";

import { UserChangeset } from "../../../types";

@Component({
  tag: "auth-register",
  styleUrl: "auth-register.scss",
  shadow: true
})
export class AuthRegister {
  changeset: UserChangeset = {
    username: "",
    email: "",
    address: ""
  }

  login() {
    console.log("login");
  }

  change(key, event) {
    this.changeset[key] = event.target.value;
  }

  formSubmitionHandler() {
    console.log(this.changeset);
  }

  render() {
    return (
      <widget-screen>
        <div class="logo">
          <app-logo />
        </div>
        <h2 class="header">Create a Playground account</h2>

        <form-container onFormSubmitted={e => this.formSubmitionHandler()}>
          <form-input label="Username" value={this.changeset.username} onChange={e => this.change('username', e)} />
          <form-input label="Email address" value={this.changeset.email} onChange={e => this.change('email', e)} />
          <form-input label="Ethereum address" value={this.changeset.address} onChange={e => this.change('address', e)} />
          <span slot="button">Create account</span>
        </form-container>
        <div slot="post">
          Already have an account? <a onClick={this.login}>Login here</a>
        </div>
      </widget-screen>
    );
  }
}
