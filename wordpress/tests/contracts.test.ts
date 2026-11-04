import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {snapshotSchema} from '../../src/core/repository';
import {propertySchema,siteSettingsSchema,navigationMenuSchema,searchFilterDefinitionSchema} from '../../src/core/contracts';
import {themeSettingsSchema} from '../../src/core/theme';
const report=JSON.parse(readFileSync('artifacts/wp-integration.json','utf8'));
describe('real WordPress DTO compatibility',()=>{
 it('has an actual successful WordPress test run',()=>expect(report.success).toBe(true));
 it('validates the published property using the Phase 1 contract',()=>expect(()=>propertySchema.parse(report.publishedProperty)).not.toThrow());
 it('validates the legacy snapshot containing a published property',()=>expect(()=>snapshotSchema.parse(report.publishedSnapshot)).not.toThrow());
 it('validates the final snapshot without archived properties',()=>expect(()=>snapshotSchema.parse(report.snapshot)).not.toThrow());
});
