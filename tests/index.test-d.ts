import { expectAssignable, expectType } from 'tsd';
import {
  boolean,
  Decoder,
  fields,
  number,
  optional,
  record,
  string,
  undef,
  union,
  array,
} from '../src';

let n = 0;
expectType<number>(n);

type rec_t = {
  data: string;
  value: number;
  rec: { more: boolean };
  f: string;
  option: string | undefined;
  list_of_stuff: (string | boolean)[];
};
const rec_decoder = record({
  data: string,
  value: number,
  rec: { more: boolean },
  f: fields({ data: string, value: number }, ({ data, value }) => data + value),
  option: optional(string),
  list_of_stuff: array(union(string, boolean)),
});
expectAssignable<Decoder<rec_t>>(rec_decoder);
expectType<rec_t>(
  rec_decoder({
    data: '',
    value: 0,
    rec: { more: true },
    option: 'yes',
  }),
);

let union_decoder = union(string, number, record({}));
expectType<string | number | {}>(union_decoder('test'));

let optional_decoder = optional(union(string, number));
expectType<string | number | undefined>(optional_decoder(''));
