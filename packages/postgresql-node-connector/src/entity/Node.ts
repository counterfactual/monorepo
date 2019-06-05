import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("node")
export class Node {
  @PrimaryColumn()
  key!: string;

  @Column({ type: "json" })
  value!: object;
}
