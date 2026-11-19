import { readFileSync, writeFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
const db = new PGlite();
const results = [];
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid()to anon,authenticated;`,
);
await db.exec(readFileSync("supabase/migrations/20261118230832_platform_foundation.sql", "utf8"));
const owner = "10000000-0000-4000-8000-000000000001",
  agent = "10000000-0000-4000-8000-000000000002",
  outsider = "10000000-0000-4000-8000-000000000003",
  id = "20000000-0000-4000-8000-000000000001";
await db.exec(
  `insert into auth.users values('${owner}'),('${agent}'),('${outsider}');insert into platform_members values('${owner}','owner',true),('${agent}','agent',true);`,
);
const pageDoc = {
  title: "Initial",
  slug: "test",
  elements: [],
  reviewApproved: false,
  seo: { title: "Initial", description: "test", index: false, manual: false },
};
const role = async (user) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
  await db.exec(`set role ${user ? "authenticated" : "anon"}`);
};
const test = async (name, fn) => {
  await fn();
  results.push({ name, passed: true });
  console.log("PASS", name);
};
await test("anonymous cannot read drafts", async () => {
  await role();
  await assert.rejects(db.query("select * from content_drafts"), /permission denied/);
});
await test("anonymous cannot call writes", async () => {
  await assert.rejects(
    db.query("select save_content($1,$2,$3,$4,$5)", [id, "page", "test", { title: "Initial" }, 0]),
    /permission denied/,
  );
});
await test("nonmember cannot write via private definer", async () => {
  await role(outsider);
  await assert.rejects(
    db.query("select save_content($1,$2,$3,$4,$5)", [id, "page", "test", { title: "Initial" }, 0]),
    /Not authorized/,
  );
});
await test("nonmember cannot edit catalogs", async () => {
  await assert.rejects(
    db.query("select save_catalog($1,$2,0)", [
      id,
      { kind: "type", slug: "x", label: "x", active: true, order: 0 },
    ]),
    /Not authorized/,
  );
});
await test("owner saves real private draft", async () => {
  await role(owner);
  await db.query("select save_content($1,$2,$3,$4,$5)", [id, "page", "test", pageDoc, 0]);
  assert.equal((await db.query("select revision from content_drafts")).rows[0].revision, 1);
});
await test("stale revision rejected", async () => {
  await assert.rejects(
    db.query("select save_content($1,$2,$3,$4,$5)", [
      id,
      "page",
      "test",
      { ...pageDoc, title: "Clobber" },
      0,
    ]),
    /Revision conflict/,
  );
});
await test("direct table writes denied even to owner", async () => {
  await assert.rejects(db.query("update content_drafts set document='{}'"), /permission denied/);
});
await test("agent cannot read or publish page", async () => {
  await role(agent);
  assert.equal((await db.query("select * from content_drafts")).rows.length, 0);
  await assert.rejects(db.query("select publish_content($1,1,true)", [id]), /Not authorized/);
});
await test("draft not present in anonymous public API", async () => {
  await role();
  assert.equal((await db.query("select * from published_content")).rows.length, 0);
});
await test("owner publication visible", async () => {
  await role(owner);
  await db.query("select publish_content($1,1,true)", [id]);
  await role();
  assert.equal(
    (await db.query("select document from published_content")).rows[0].document.title,
    "Initial",
  );
});
await test("editing published page never leaks working copy", async () => {
  await role(owner);
  await db.query("select save_content($1,$2,$3,$4,$5)", [
    id,
    "page",
    "test",
    { ...pageDoc, title: "Private changes" },
    1,
  ]);
  await role();
  assert.equal(
    (await db.query("select document from published_content")).rows[0].document.title,
    "Initial",
  );
});
await test("history retained for restoration", async () => {
  await role(owner);
  const r = await db.query(
    "select document from content_revisions where resource_id=$1 and revision=1",
    [id],
  );
  await db.query("select save_content($1,$2,$3,$4,$5)", [
    id,
    "page",
    "test",
    r.rows[0].document,
    2,
  ]);
  assert.equal((await db.query("select count(*)::int c from content_revisions")).rows[0].c, 3);
});
await test("unpublish removes anonymous document", async () => {
  await db.query("select publish_content($1,3,false)", [id]);
  await role();
  assert.equal((await db.query("select * from published_content")).rows.length, 0);
});
await test("leads and history cannot be read publicly", async () => {
  for (const table of [
    "leads",
    "content_revisions",
    "audit_events",
    "platform_members",
    "media_assets",
  ])
    await assert.rejects(db.query(`select * from ${table}`), /permission denied/);
});
await test("member cannot self promote", async () => {
  await role(agent);
  await assert.rejects(db.query("update platform_members set role='owner'"), /permission denied/);
});
await test("all exposed tables have RLS", async () => {
  await db.exec("reset role");
  const r = await db.query(
    "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity",
  );
  assert.equal(r.rows.length, 0);
});
await test("schema accepts a safe URL and rejects javascript at the database boundary",async()=>{
 await role(owner);const element={id:'hero',label:'Hero',title:'T',subtitle:'',body:'',mobile:{},desktop:{},visible:true,automatic:true,propertyIds:[],categoryIds:[],button:{label:'X',href:'/propiedades'}};const safe={...pageDoc,elements:[element]};
 await db.query('select save_content($1,$2,$3,$4,$5)',[id,'page','test',safe,3]);
 await assert.rejects(db.query('select save_content($1,$2,$3,$4,$5)',[id,'page','test',{...safe,elements:[{...element,button:{label:'X',href:'javascript:alert(1)'}}]},4]),/Document validation failed/);
});
await test("SQL-looking text remains literal data",async()=>{const title="x'; DROP TABLE public.leads; --";await db.query('select save_content($1,$2,$3,$4,$5)',[id,'page','test',{...pageDoc,title},4]);assert.equal((await db.query('select document from content_drafts where id=$1',[id])).rows[0].document.title,title);assert.equal((await db.query('select count(*)::int n from leads')).rows[0].n,0);});
await test("seed is idempotent and never creates properties", async () => {
  await db.exec("reset role");
  const seed = readFileSync(
    "supabase/migrations/20261119134210_rivton_initial_profile.sql",
    "utf8",
  );
  await db.exec(seed);
  const before = (await db.query("select count(*)::int c from content_drafts")).rows[0].c;
  await db.exec(seed);
  assert.equal((await db.query("select count(*)::int c from content_drafts")).rows[0].c, before);
  assert.equal(
    (await db.query("select count(*)::int c from content_drafts where kind='property'")).rows[0].c,
    0,
  );
});
await test("real property publication preserves privacy, typed values and price-to-consult", async () => {
  await role(owner);
  const type = (
    await db.query("select id from catalog_entries where kind='type' and slug='galpon'")
  ).rows[0].id;
  const op = (
    await db.query("select id from catalog_entries where kind='operation' and slug='alquiler'")
  ).rows[0].id;
  const attr = (
    await db.query("select id from catalog_entries where kind='attribute' and slug='dormitorios'")
  ).rows[0].id;
  const media = (await db.query("select id,alt,width,height,object_path from media_assets limit 1"))
    .rows[0];
  const prop = {
    title: "Isolated QA property",
    slug: "isolated-qa-property",
    code: "QA-ONLY",
    typeId: type,
    operationId: op,
    commercialStatus: "available",
    featured: false,
    novelty: false,
    summary: "",
    description: "Isolated test fixture, never a commercial record.",
    provinceId: "14",
    province: "Córdoba",
    cityId: "14014010",
    city: "Córdoba",
    neighborhood: "Centro",
    address: "Private exact address",
    publicAddress: false,
    price: null,
    attributes: { [attr]: 3 },
    images: [
      {
        id: media.id,
        src: "/media/" + media.object_path.slice(9),
        alt: media.alt,
        width: media.width,
        height: media.height,
      },
    ],
    seo: { title: "QA", description: "QA only", index: false, manual: false },
  };
  const propertyId = "30000000-0000-4000-8000-000000000001";
  await db.query("select save_content($1,$2,$3,$4,0)", [propertyId, "property", prop.slug, prop]);
  await db.query("select publish_content($1,1,true)", [propertyId]);
  await role();
  const published = (
    await db.query("select document from published_content where id=$1", [propertyId])
  ).rows[0].document;
  assert.equal(published.address, "");
  assert.equal(published.price, null);
  await role(owner);
  const bad = { ...prop, attributes: { [attr]: "three" } };
  await db.query("select save_content($1,$2,$3,$4,1)", [propertyId, "property", prop.slug, bad]);
  await assert.rejects(
    db.query("select publish_content($1,2,true)", [propertyId]),
    /Invalid typed attribute/,
  );
  await db.query("select save_content($1,$2,$3,$4,2)", [
    propertyId,
    "property",
    "new-qa-slug",
    { ...prop, slug: "new-qa-slug" },
  ]);
  await db.query("select publish_content($1,3,true)", [propertyId]);
  await role();
  assert.equal(
    (
      await db.query(
        "select target from content_redirects where path='/propiedades/isolated-qa-property'",
      )
    ).rows[0].target,
    "/propiedades/new-qa-slug",
  );
  await role(owner);
  await db.query("select publish_content($1,3,false)", [propertyId]);
  await role();
  assert.equal(
    (await db.query("select status from content_redirects where path='/propiedades/new-qa-slug'"))
      .rows[0].status,
    410,
  );
});
await test("public form requires consent, stores only approved submissions and deduplicates", async () => {
  await role(owner);
  const { rows } = await db.query(
    "select id,document,revision from content_drafts where kind='form' and slug='contacto'",
  );
  const f = rows[0];
  const privacy = (
    await db.query(
      "select id,document,revision from content_drafts where kind='page'and slug='privacidad'",
    )
  ).rows[0];
  await db.query("select save_content($1,$2,$3,$4,$5)", [
    privacy.id,
    "page",
    "privacidad",
    { ...privacy.document, reviewApproved: true },
    privacy.revision,
  ]);
  await db.query("select publish_content($1,2,true)", [privacy.id]);
  const doc = {
    ...f.document,
    active: true,
    privacyApproved: true,
    privacyRevision: `${privacy.id}:2`,
    storeLead: true,
  };
  await db.query("select save_content($1,$2,$3,$4,$5)", [
    f.id,
    "form",
    "contacto",
    doc,
    f.revision,
  ]);
  await db.query("select publish_content($1,2,true)", [f.id]);
  await role();
  const answers = {
      name: "QA synthetic",
      email: "qa@example.invalid",
      phone: "12345678",
      message: "Synthetic fixture",
      consent: true,
    },
    key = "40000000-0000-4000-8000-000000000001";
  await assert.rejects(
    db.query("select submit_form($1,$2,$3,null,$4)", [
      f.id,
      { ...answers, consent: false },
      key,
      "/contacto",
    ]),
    /Consent required/,
  );
  const first = (
    await db.query("select submit_form($1,$2,$3,null,$4) r", [f.id, answers, key, "/contacto"])
  ).rows[0].r;
  const second = (
    await db.query("select submit_form($1,$2,$3,null,$4) r", [f.id, answers, key, "/contacto"])
  ).rows[0].r;
  assert.equal(first.stored, true);
  assert.equal(second.duplicate, true);
  assert.equal(first.leadId, second.leadId);
  await assert.rejects(db.query("select * from leads"), /permission denied/);
  await role(agent);
  await db.query("select update_lead($1,$2,$3)", [
    first.leadId,
    "following",
    "Synthetic test note",
  ]);
  assert.equal(
    (await db.query("select status from leads where id=$1", [first.leadId])).rows[0].status,
    "following",
  );
});

writeFileSync(
  ".tmp/platform-database-tests.json",
  JSON.stringify(
    { engine: (await db.query("select version()")).rows[0].version, results },
    null,
    2,
  ),
);
await db.close();
