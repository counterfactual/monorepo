import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("node_store")
export class NodeStore {
  @PrimaryColumn()
  key!: string;

  @Column({ type: "json" })
  value!: object;
}
