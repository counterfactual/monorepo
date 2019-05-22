import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Node {
  @PrimaryColumn()
  // @ts-ignore
  key: string;

  @Column("json")
  // @ts-ignore
  value: object;
}
