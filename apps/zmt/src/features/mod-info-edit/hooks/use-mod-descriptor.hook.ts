import { GamePlugin, IpcError, isIpcError } from '@contracts';
import {
  dialectsFromPlugins,
  parse,
  type ParseError,
  type Script,
} from '@paradox-parser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { astToFormValues } from '../ast-adapter';
import { ResolvedModDescriptorSchema } from '../mod-info-edit.model';
import { resolveSchemaForPlugin } from '../mod-info-edit.schema';
import { modInfoEditService } from '../services/mod-info-edit.service';

export interface UseModDescriptorResult {
  readonly astRef: React.RefObject<null | Script>;
  readonly originalSourceRef: React.RefObject<string>;
  readonly reload: () => void;
  readonly status: Status;
}

interface LoadedData {
  readonly defaultValues: Record<string, unknown>;
  readonly descriptorPath: string;
  readonly parseErrors: readonly ParseError[];
  readonly plugin: GamePlugin;
  readonly schema: ResolvedModDescriptorSchema;
}

interface SettledResult {
  readonly status: Exclude<Status, { kind: 'loading' }>;
  readonly version: number;
}

type Status =
  | { readonly data: LoadedData; readonly kind: 'ready' }
  | { readonly error: IpcError; readonly kind: 'error' }
  | { readonly kind: 'loading' };

interface UseModDescriptorOptions {
  readonly modRootPath: string;
}

const LOADING: Status = { kind: 'loading' };

export function useModDescriptor({
  modRootPath,
}: UseModDescriptorOptions): UseModDescriptorResult {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<null | SettledResult>(null);
  const astRef = useRef<null | Script>(null);
  const originalSourceRef = useRef<string>('');

  const descriptorPath = useMemo(
    () => modInfoEditService.descriptorPathForRoot(modRootPath),
    [modRootPath],
  );

  useEffect(() => {
    let cancelled = false;
    const myVersion = version;

    void (async () => {
      try {
        const [plugins, text] = await Promise.all([
          window.api.plugins.list(),
          modInfoEditService.readDescriptor(descriptorPath),
        ]);
        if (cancelled) return;

        const plugin = plugins[0];
        if (plugin === undefined) {
          setSettled({
            status: {
              error: { code: 404, message: 'No game plugin registered.' },
              kind: 'error',
            },
            version: myVersion,
          });
          return;
        }

        const schema = resolveSchemaForPlugin(plugin);
        const ast = parse(text, {
          dialects: dialectsFromPlugins([plugin]),
        });
        astRef.current = ast;
        originalSourceRef.current = text;
        const defaultValues = astToFormValues(ast, schema);

        setSettled({
          status: {
            data: {
              defaultValues,
              descriptorPath,
              parseErrors: ast.errors,
              plugin,
              schema,
            },
            kind: 'ready',
          },
          version: myVersion,
        });
      } catch (rawError: unknown) {
        if (cancelled) return;
        const error: IpcError = isIpcError(rawError)
          ? rawError
          : { code: 500, message: String(rawError) };
        setSettled({
          status: { error, kind: 'error' },
          version: myVersion,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [descriptorPath, version]);

  const reload = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const status: Status =
    settled !== null && settled.version === version ? settled.status : LOADING;

  return { astRef, originalSourceRef, reload, status };
}
