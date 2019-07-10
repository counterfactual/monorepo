import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("node_records")
export class NodeRecord {
  @PrimaryColumn()
  key!: string;

  @Column({ type: "json" })
  value!: object;
}
