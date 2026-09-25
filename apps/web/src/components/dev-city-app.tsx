'use client';

import {
  Html,
  OrbitControls,
  Stars,
} from '@react-three/drei';
import {
  Canvas,
  type ThreeEvent,
} from '@react-three/fiber';
import { useMemo, useState } from 'react';
import * as THREE from 'three';
import {
  createCityModel,
  formatBytes,
  getBuildingColor,
  type CityBuilding,
  type CityDistrict,
  type RepositorySnapshot,
} from '@/lib/city';
import { demoSnapshot } from '@/lib/demo';
import { loadRepository } from '@/lib/github';
import {
  hoverBuilding,
  resetUi,
  selectBuilding,
  setColorMode,
  setQuery,
  toggleLanguage,
  useAppDispatch,
  useAppSelector,
} from '@/store/store';

function Building({
  building,
  maxSize,
  visible,
}: {
  building: CityBuilding;
  maxSize: number;
  visible: boolean;
}) {
  const dispatch = useAppDispatch();
  const selectedPath = useAppSelector((state) => state.cityUi.selectedPath);
  const hoveredPath = useAppSelector((state) => state.cityUi.hoveredPath);
  const colorMode = useAppSelector((state) => state.cityUi.colorMode);
  const selected = selectedPath === building.path;
  const hovered = hoveredPath === building.path;
  const color = getBuildingColor(building, colorMode, maxSize);

  if (!visible) return null;

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    dispatch(hoverBuilding(building.path));
    document.body.style.cursor = 'pointer';
  };

  const handleOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    dispatch(hoverBuilding(null));
    document.body.style.cursor = 'default';
  };

  return (
    <group>
      <mesh
        position={building.position}
        castShadow
        receiveShadow
        scale={hovered ? [1.05, 1.04, 1.05] : [1, 1, 1]}
        onClick={(event) => {
          event.stopPropagation();
          dispatch(selectBuilding(building.path));
        }}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <boxGeometry args={building.dimensions} />
        <meshStandardMaterial
          color={color}
          emissive={selected || hovered ? color : '#000000'}
          emissiveIntensity={selected ? 0.4 : hovered ? 0.18 : 0}
          metalness={0.18}
          roughness={0.38}
        />
      </mesh>

      {selected ? (
        <mesh
          position={[
            building.position[0],
            building.dimensions[1] + 0.7,
            building.position[2],
          ]}
        >
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#b5ff55" />
          <pointLight color="#b5ff55" intensity={2.2} distance={4} />
        </mesh>
      ) : null}
    </group>
  );
}

function DistrictPlate({ district }: { district: CityDistrict }) {
  return (
    <group>
      <mesh
        position={[
          district.center[0],
          0.02,
          district.center[2],
        ]}
        receiveShadow
      >
        <boxGeometry args={[district.width, 0.08, district.depth]} />
        <meshStandardMaterial
          color="#10151d"
          metalness={0.05}
          roughness={0.86}
        />
      </mesh>

      <gridHelper
        args={[
          Math.max(district.width, district.depth),
          Math.max(5, Math.floor(Math.max(district.width, district.depth))),
          '#27313f',
          '#171d26',
        ]}
        position={[
          district.center[0],
          0.071,
          district.center[2],
        ]}
      />

      <Html
        position={[
          district.center[0] - district.width / 2 + 0.35,
          0.18,
          district.center[2] - district.depth / 2 + 0.35,
        ]}
        center={false}
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
      >
        <span className="district-label">
          {district.name.toUpperCase()}
        </span>
      </Html>
    </group>
  );
}

function CityScene({
  snapshot,
  cameraKey,
}: {
  snapshot: RepositorySnapshot;
  cameraKey: number;
}) {
  const model = useMemo(() => createCityModel(snapshot), [snapshot]);
  const dispatch = useAppDispatch();
  const query = useAppSelector((state) => state.cityUi.query)
    .trim()
    .toLowerCase();
  const hiddenLanguages = useAppSelector(
    (state) => state.cityUi.hiddenLanguages,
  );
  const maxSize = Math.max(...model.buildings.map((building) => building.size), 1);

  return (
    <>
      <color attach="background" args={['#07090d']} />
      <fog attach="fog" args={['#07090d', 28, 78]} />

      <ambientLight intensity={1.2} />
      <hemisphereLight
        color="#dce6ff"
        groundColor="#0b0e13"
        intensity={1.25}
      />
      <directionalLight
        position={[16, 28, 12]}
        intensity={2.5}
        color="#e8eeff"
        castShadow
      />
      <directionalLight
        position={[-18, 12, -12]}
        intensity={1.1}
        color="#7d72ff"
      />

      <Stars
        radius={90}
        depth={30}
        count={900}
        factor={2}
        saturation={0.2}
        fade
        speed={0.15}
      />

      {model.districts.map((district) => (
        <DistrictPlate key={district.id} district={district} />
      ))}

      {model.buildings.map((building) => {
        const matchesSearch =
          !query || building.path.toLowerCase().includes(query);
        const visible =
          matchesSearch &&
          !hiddenLanguages.includes(building.language);

        return (
          <Building
            key={building.id}
            building={building}
            maxSize={maxSize}
            visible={visible}
          />
        );
      })}

      <mesh
        position={[0, -0.16, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={() => dispatch(selectBuilding(null))}
      >
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#090c11" roughness={1} />
      </mesh>

      <OrbitControls
        key={cameraKey}
        makeDefault
        enableDamping
        dampingFactor={0.07}
        minDistance={8}
        maxDistance={75}
        maxPolarAngle={Math.PI / 2.06}
        target={[0, 2.6, 0]}
      />
    </>
  );
}

function Stat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="min-w-0 border-l border-white/10 pl-3 first:border-l-0 first:pl-0">
      <strong className="block truncate text-sm font-semibold tracking-[-0.04em] text-white">
        {value}
      </strong>
      <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </span>
    </div>
  );
}

export function DevCityApp() {
  const dispatch = useAppDispatch();
  const selectedPath = useAppSelector((state) => state.cityUi.selectedPath);
  const query = useAppSelector((state) => state.cityUi.query);
  const hiddenLanguages = useAppSelector(
    (state) => state.cityUi.hiddenLanguages,
  );
  const colorMode = useAppSelector((state) => state.cityUi.colorMode);
  const [snapshot, setSnapshot] = useState<RepositorySnapshot>(demoSnapshot);
  const [input, setInput] = useState('leoo1992/DevCity');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('DEMO CITY');
  const [error, setError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);

  const model = useMemo(() => createCityModel(snapshot), [snapshot]);
  const selected = model.buildings.find(
    (building) => building.path === selectedPath,
  );

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setNotice('SCANNING REPOSITORY');
    dispatch(resetUi());

    try {
      const nextSnapshot = await loadRepository(input);
      setSnapshot(nextSnapshot);
      setNotice(
        nextSnapshot.truncated ? 'CITY READY · TREE TRUNCATED' : 'CITY READY',
      );
      setCameraKey((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Falha ao analisar repositório.',
      );
      setNotice('SCAN FAILED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative h-dvh min-h-[620px] overflow-hidden bg-[#07090d] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(125,114,255,.10),transparent_31%)]" />

      <header className="absolute inset-x-0 top-0 z-40 border-b border-white/10 bg-[#080a0f]/88 backdrop-blur-xl">
        <div className="flex min-h-[72px] items-center gap-4 px-4 lg:px-6">
          <a
            href="#"
            className="flex min-w-0 shrink-0 items-center gap-3"
            aria-label="DevCity"
          >
            <span className="relative grid size-10 place-items-center overflow-hidden rounded-xl border border-white/15 bg-white/[.03]">
              <span className="absolute bottom-2 left-2 h-4 w-1.5 bg-[#b5ff55]" />
              <span className="absolute bottom-2 left-[17px] h-6 w-1.5 bg-[#7d72ff]" />
              <span className="absolute bottom-2 right-2 h-3 w-1.5 bg-[#ff7557]" />
            </span>
            <span className="hidden sm:block">
              <strong className="block text-sm font-semibold tracking-[-.04em]">
                DevCity
              </strong>
              <small className="block font-mono text-[7px] uppercase tracking-[.14em] text-zinc-500">
                repository urbanizer
              </small>
            </span>
          </a>

          <form
            className="mx-auto flex min-w-0 max-w-2xl flex-1 items-center rounded-xl border border-white/10 bg-black/20 p-1"
            onSubmit={(event) => {
              event.preventDefault();
              void analyze();
            }}
          >
            <span className="hidden px-2 font-mono text-[9px] text-[#b5ff55] md:block">
              GITHUB /
            </span>
            <input
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[11px] text-white outline-none placeholder:text-zinc-600"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="owner/repository"
              aria-label="Repositório GitHub"
            />
            <button
              className="rounded-lg bg-[#b5ff55] px-4 py-2 text-[9px] font-bold uppercase tracking-[.08em] text-[#071006] transition hover:bg-[#c8ff7c] disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Scanning…' : 'Build city'}
            </button>
          </form>

          <div className="hidden items-center gap-2 font-mono text-[8px] uppercase tracking-[.1em] text-zinc-500 xl:flex">
            <i className="size-1.5 rounded-full bg-[#b5ff55] shadow-[0_0_14px_#b5ff55]" />
            {notice}
          </div>
        </div>
      </header>

      <section className="absolute inset-0 pt-[72px]">
        <div className="absolute inset-x-0 top-[72px] z-30 flex min-h-[64px] items-center justify-between gap-4 border-b border-white/[.07] bg-[#090b10]/75 px-4 backdrop-blur-md lg:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <div className="min-w-0">
              <span className="font-mono text-[7px] uppercase tracking-[.13em] text-zinc-500">
                ACTIVE REPOSITORY
              </span>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <strong className="truncate text-[13px] tracking-[-.03em] text-white">
                  {snapshot.owner}/{snapshot.repo}
                </strong>
                <a
                  href={snapshot.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[8px] text-[#7d72ff] hover:text-white"
                >
                  ↗
                </a>
              </div>
            </div>

            <div className="hidden grid-cols-4 gap-4 border-l border-white/10 pl-5 md:grid">
              <Stat value={model.totalFiles} label="files" />
              <Stat value={model.districts.length} label="districts" />
              <Stat value={formatBytes(model.totalBytes)} label="size" />
              <Stat value={snapshot.stars} label="stars" />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden rounded-lg border border-white/10 bg-black/20 p-1 sm:flex">
              <button
                className={
                  'rounded-md px-2.5 py-1.5 font-mono text-[7px] uppercase tracking-[.08em] transition ' +
                  (colorMode === 'language'
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-500 hover:text-white')
                }
                type="button"
                onClick={() => dispatch(setColorMode('language'))}
              >
                Language
              </button>
              <button
                className={
                  'rounded-md px-2.5 py-1.5 font-mono text-[7px] uppercase tracking-[.08em] transition ' +
                  (colorMode === 'size'
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-500 hover:text-white')
                }
                type="button"
                onClick={() => dispatch(setColorMode('size'))}
              >
                Size heat
              </button>
            </div>

            <button
              className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 font-mono text-[7px] uppercase tracking-[.08em] text-zinc-400 transition hover:border-white/20 hover:text-white"
              type="button"
              onClick={() => setCameraKey((value) => value + 1)}
            >
              Reset view
            </button>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 top-[136px]">
          <Canvas
            shadows
            dpr={[1, 1.75]}
            camera={{
              position: [24, 23, 28],
              fov: 45,
              near: 0.1,
              far: 180,
            }}
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.05,
            }}
          >
            <CityScene
              snapshot={snapshot}
              cameraKey={cameraKey}
            />
          </Canvas>
        </div>
      </section>

      <aside className="absolute bottom-4 left-4 z-40 w-[min(330px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e14]/88 shadow-2xl backdrop-blur-xl lg:bottom-6 lg:left-6">
        <div className="border-b border-white/10 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[7px] uppercase tracking-[.13em] text-zinc-500">
              CITY INDEX
            </span>
            <span className="font-mono text-[7px] text-zinc-600">
              {model.renderedFiles}/{model.totalFiles}
            </span>
          </div>

          <label className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5">
            <span className="text-zinc-600">⌕</span>
            <input
              className="min-w-0 flex-1 bg-transparent py-2 text-[10px] text-white outline-none placeholder:text-zinc-600"
              value={query}
              onChange={(event) => dispatch(setQuery(event.target.value))}
              placeholder="Filtrar arquivos…"
            />
          </label>
        </div>

        <div className="max-h-[150px] overflow-y-auto p-3">
          <div className="flex flex-wrap gap-1.5">
            {model.languages.map((item) => {
              const hidden = hiddenLanguages.includes(item.language);

              return (
                <button
                  key={item.language}
                  type="button"
                  onClick={() => dispatch(toggleLanguage(item.language))}
                  className={
                    'inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[7px] transition ' +
                    (hidden
                      ? 'border-white/[.05] text-zinc-700'
                      : 'border-white/10 text-zinc-300 hover:border-white/20')
                  }
                >
                  <i
                    className="size-1.5 rounded-full"
                    style={{
                      background: hidden ? '#343943' : item.color,
                    }}
                  />
                  {item.language}
                  <span className="text-zinc-600">{item.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <aside className="absolute bottom-4 right-4 z-40 w-[min(350px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e14]/90 shadow-2xl backdrop-blur-xl lg:bottom-6 lg:right-6">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
          <div className="min-w-0">
            <span className="font-mono text-[7px] uppercase tracking-[.13em] text-zinc-500">
              BUILDING INSPECTOR
            </span>
            <h2 className="mt-1 truncate text-[15px] font-semibold tracking-[-.04em] text-white">
              {selected?.name ?? 'Select a building'}
            </h2>
          </div>

          {selected ? (
            <button
              type="button"
              className="font-mono text-[8px] text-zinc-500 hover:text-white"
              onClick={() => dispatch(selectBuilding(null))}
            >
              CLOSE
            </button>
          ) : null}
        </div>

        {selected ? (
          <div className="space-y-4 p-4">
            <p className="break-all font-mono text-[9px] leading-5 text-zinc-400">
              {selected.path}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/[.08] bg-white/[.025] p-2.5">
                <span className="block font-mono text-[6px] uppercase tracking-[.1em] text-zinc-600">
                  HEIGHT
                </span>
                <strong className="mt-1 block text-[11px] text-white">
                  {selected.dimensions[1].toFixed(1)}
                </strong>
              </div>
              <div className="rounded-lg border border-white/[.08] bg-white/[.025] p-2.5">
                <span className="block font-mono text-[6px] uppercase tracking-[.1em] text-zinc-600">
                  SIZE
                </span>
                <strong className="mt-1 block text-[11px] text-white">
                  {formatBytes(selected.size)}
                </strong>
              </div>
              <div className="rounded-lg border border-white/[.08] bg-white/[.025] p-2.5">
                <span className="block font-mono text-[6px] uppercase tracking-[.1em] text-zinc-600">
                  TYPE
                </span>
                <strong className="mt-1 block truncate text-[11px] text-white">
                  {selected.extension || 'file'}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/[.08] pt-3">
              <span className="inline-flex items-center gap-2 font-mono text-[8px] text-zinc-400">
                <i
                  className="size-2 rounded-full"
                  style={{ background: selected.color }}
                />
                {selected.language}
              </span>
              <span className="font-mono text-[7px] uppercase tracking-[.1em] text-zinc-600">
                DISTRICT / {selected.district}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid min-h-[105px] place-items-center rounded-xl border border-dashed border-white/10 bg-white/[.015] text-center">
              <div>
                <span className="mx-auto grid size-8 place-items-center rounded-full bg-[#b5ff55] text-[10px] text-[#071006]">
                  ↖
                </span>
                <p className="mt-2 text-[9px] leading-4 text-zinc-500">
                  Clique em qualquer prédio para inspecionar o arquivo.
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {loading ? (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[#07090d]/55 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/10 bg-[#0d1017] px-7 py-6 text-center shadow-2xl">
            <span className="city-loader mx-auto block" />
            <strong className="mt-4 block text-sm tracking-[-.03em]">
              Urbanizando repositório
            </strong>
            <small className="mt-1 block font-mono text-[7px] uppercase tracking-[.13em] text-zinc-500">
              reading tree / zoning / extruding
            </small>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute left-1/2 top-[148px] z-50 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-red-400/20 bg-red-950/80 p-3 text-[10px] text-red-100 shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <p className="m-0 leading-5">{error}</p>
            <button
              type="button"
              className="font-mono text-[8px] text-red-300"
              onClick={() => setError(null)}
            >
              CLOSE
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
