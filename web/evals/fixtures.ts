import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';
import { ResumeSchema, type Resume } from '../lib/resume-schema';

export const TruthSchema = z.object({
  /** Posting terms the résumé genuinely backs: the only keywords coverage counts. */
  supported: z.array(z.string().min(1)).min(1),
  /** Posting skills the résumé deliberately lacks: must never be claimed. */
  traps: z.array(z.string().min(1)).min(1),
  fitBand: z.enum(['low', 'mid', 'high']),
});

export type Truth = z.infer<typeof TruthSchema>;

export type Fixture = {
  slug: string;
  resumeText: string;
  resume: Resume;
  company: string;
  role: string;
  description: string;
  truth: Truth;
};

const read = (dir: string, file: string) => readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');

export function loadFixture(dir: string): Fixture {
  const slug = basename(dir);
  const [header, ...rest] = read(dir, 'job.md').split('\n');
  const m = header.match(/^(.+?)\s+—\s+(.+)$/);
  if (!m) throw new Error(`${slug}/job.md: first line must be "Company — Role"`);
  return {
    slug,
    resumeText: read(dir, 'resume.txt'),
    resume: ResumeSchema.parse(JSON.parse(read(dir, 'resume.json'))),
    company: m[1].trim(),
    role: m[2].trim(),
    description: rest.join('\n').trim(),
    truth: TruthSchema.parse(JSON.parse(read(dir, 'truth.json'))),
  };
}

export function loadFixtures(root = join(process.cwd(), 'evals', 'fixtures')): Fixture[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((name) => loadFixture(join(root, name)));
}
