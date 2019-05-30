import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Node {
  @PrimaryColumn()
  key!: string;

  @Column("json")
  value!: object;
}
