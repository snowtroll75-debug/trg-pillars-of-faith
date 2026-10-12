import { ClassicLevel } from "classic-level";
const db = new ClassicLevel(process.argv[2], { valueEncoding: "json" });
let n=0;
for await (const [k, v] of db.iterator()) { n++; if (n<40) console.log(k, v.name, v.changes ? JSON.stringify(v.changes) : ""); }
console.log("total", n);
await db.close();
