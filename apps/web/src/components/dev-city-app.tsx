'use client';

import {
  Html,
  OrbitControls,
  Stars,
} from '@react-three/drei';
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from '@react-three/fiber';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
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
import {
  listOwnerRepositories,
  loadRepository,
  type RepositoryOption,
} from '@/lib/github';
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
  onSelect,
}: {
  building: CityBuilding;
  maxSize: number;
  visible: boolean;
  onSelect: () => void;
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
          onSelect();
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

interface NavigationIntent {
  forward: number;
  strafe: number;
  vertical: number;
  boost: boolean;
}

const IDLE_NAVIGATION: NavigationIntent = {
  forward: 0,
  strafe: 0,
  vertical: 0,
  boost: false,
};

function CityNavigation({
  cameraKey,
  navigationIntent,
}: {
  cameraKey: number;
  navigationIntent: NavigationIntent;
}) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const pressedKeys = useRef(new Set<string>());
  const { camera } = useThree();

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;

    const navigationKeys = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyQ',
      'KeyE',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ShiftLeft',
      'ShiftRight',
    ]);

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || !navigationKeys.has(event.code)) {
        return;
      }

      event.preventDefault();
      pressedKeys.current.add(event.code);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.code);
    };

    const onBlur = () => {
      pressedKeys.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    camera.position.set(24, 23, 28);
    controls.target.set(0, 2.6, 0);
    controls.update();
  }, [camera, cameraKey]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const keyboardForward =
      (pressedKeys.current.has('KeyW') ||
      pressedKeys.current.has('ArrowUp')
        ? 1
        : 0) -
      (pressedKeys.current.has('KeyS') ||
      pressedKeys.current.has('ArrowDown')
        ? 1
        : 0);
    const keyboardStrafe =
      (pressedKeys.current.has('KeyD') ||
      pressedKeys.current.has('ArrowRight')
        ? 1
        : 0) -
      (pressedKeys.current.has('KeyA') ||
      pressedKeys.current.has('ArrowLeft')
        ? 1
        : 0);
    const keyboardVertical =
      (pressedKeys.current.has('KeyE') ? 1 : 0) -
      (pressedKeys.current.has('KeyQ') ? 1 : 0);

    const forwardAxis = THREE.MathUtils.clamp(
      keyboardForward + navigationIntent.forward,
      -1,
      1,
    );
    const strafeAxis = THREE.MathUtils.clamp(
      keyboardStrafe + navigationIntent.strafe,
      -1,
      1,
    );
    const verticalAxis = THREE.MathUtils.clamp(
      keyboardVertical + navigationIntent.vertical,
      -1,
      1,
    );

    if (forwardAxis === 0 && strafeAxis === 0 && verticalAxis === 0) {
      return;
    }

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;

    if (forward.lengthSq() < 0.0001) {
      forward.set(0, 0, -1);
    }

    forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, camera.up)
      .normalize();

    const movement = new THREE.Vector3()
      .addScaledVector(forward, forwardAxis)
      .addScaledVector(right, strafeAxis);

    if (movement.lengthSq() > 0) {
      movement.normalize();
    }

    movement.y = verticalAxis;

    if (movement.lengthSq() === 0) return;

    const boosted =
      navigationIntent.boost ||
      pressedKeys.current.has('ShiftLeft') ||
      pressedKeys.current.has('ShiftRight');
    const speed = (boosted ? 19 : 8.5) * delta;

    movement.multiplyScalar(speed);
    camera.position.add(movement);
    controls.target.add(movement);
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      enablePan
      screenSpacePanning
      dampingFactor={0.07}
      minDistance={2.5}
      maxDistance={90}
      maxPolarAngle={Math.PI / 2.02}
      target={[0, 2.6, 0]}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}

function CityScene({
  snapshot,
  cameraKey,
  navigationIntent,
  onSelectBuilding,
}: {
  snapshot: RepositorySnapshot;
  cameraKey: number;
  navigationIntent: NavigationIntent;
  onSelectBuilding: () => void;
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
            onSelect={onSelectBuilding}
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

      <CityNavigation
        cameraKey={cameraKey}
        navigationIntent={navigationIntent}
      />
    </>
  );
}

function MovementButton({
  label,
  className,
  intent,
  onChange,
}: {
  label: string;
  className?: string;
  intent: NavigationIntent;
  onChange: (intent: NavigationIntent) => void;
}) {
  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onChange(intent);
  };

  const stop = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onChange(IDLE_NAVIGATION);
  };

  return (
    <button
      type="button"
      className={`mobile-move-button ${className ?? ''}`}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      aria-label={label}
    >
      {label}
    </button>
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
      <strong className="block truncate text-base font-semibold tracking-[-0.04em] text-white">
        {value}
      </strong>
      <span className="mt-0.5 block font-mono text-[14px] uppercase tracking-[0.12em] text-zinc-500">
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
  const [input, setInput] = useState('leoo1992/');
  const [repositoryOptions, setRepositoryOptions] = useState<RepositoryOption[]>([]);
  const [repositoryMenuOpen, setRepositoryMenuOpen] = useState(false);
  const [repositoryLoading, setRepositoryLoading] = useState(false);
  const repositoryCache = useRef(new Map<string, RepositoryOption[]>());
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('DEMO CITY');
  const [error, setError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<
    'none' | 'filters' | 'inspector'
  >('none');
  const [navigationIntent, setNavigationIntent] =
    useState<NavigationIntent>(IDLE_NAVIGATION);

  const repositoryQuery = useMemo(() => {
    const cleaned = input
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/^github\.com\//i, '')
      .replace(/^\/+/, '');
    const separator = cleaned.indexOf('/');

    if (separator <= 0) {
      return null;
    }

    const owner = cleaned.slice(0, separator);
    const term = cleaned.slice(separator + 1).toLowerCase();

    if (!/^[A-Za-z0-9_.-]+$/.test(owner)) {
      return null;
    }

    return { owner, term };
  }, [input]);

  useEffect(() => {
    if (!repositoryQuery) return;

    let cancelled = false;
    const cached = repositoryCache.current.get(repositoryQuery.owner);

    const timer = window.setTimeout(async () => {
      if (cached) {
        setRepositoryOptions(cached);
        setRepositoryLoading(false);
        return;
      }

      setRepositoryLoading(true);

      try {
        const repositories = await listOwnerRepositories(repositoryQuery.owner);

        if (cancelled) return;

        repositoryCache.current.set(repositoryQuery.owner, repositories);
        setRepositoryOptions(repositories);
      } catch {
        if (!cancelled) {
          setRepositoryOptions([]);
        }
      } finally {
        if (!cancelled) {
          setRepositoryLoading(false);
        }
      }
    }, cached ? 0 : 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [repositoryQuery]);

  const filteredRepositoryOptions = useMemo(() => {
    if (!repositoryQuery) return [];

    const term = repositoryQuery.term;

    return repositoryOptions
      .filter((repository) =>
        !term || repository.name.toLowerCase().includes(term),
      )
      .slice(0, 9);
  }, [repositoryOptions, repositoryQuery]);

  const model = useMemo(() => createCityModel(snapshot), [snapshot]);
  const selected = model.buildings.find(
    (building) => building.path === selectedPath,
  );

  const analyze = async (targetRepository = input) => {
    if (!targetRepository.trim() || targetRepository.trim().endsWith('/')) {
      setRepositoryMenuOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    setNotice('SCANNING REPOSITORY');
    dispatch(resetUi());

    try {
      const nextSnapshot = await loadRepository(targetRepository);
      setSnapshot(nextSnapshot);
      setNotice(
        nextSnapshot.truncated ? 'CITY READY · TREE TRUNCATED' : 'CITY READY',
      );
      setInput(nextSnapshot.owner + '/' + nextSnapshot.repo);
      setRepositoryMenuOpen(false);
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
    <main
      className="devcity-app relative h-dvh overflow-hidden bg-[#07090d] text-zinc-100"
      data-mobile-panel={mobilePanel}
    >
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(125,114,255,.10),transparent_31%)]" />

      <header className="devcity-header absolute inset-x-0 top-0 z-40 border-b border-white/10 bg-[#080a0f]/88 backdrop-blur-xl">
        <div className="devcity-header-inner flex min-h-[72px] items-center gap-4 px-4 lg:px-6">
          <a
            href="#"
            className="devcity-brand flex min-w-0 shrink-0 items-center gap-3"
            aria-label="DevCity"
          >
            <span className="relative grid size-10 place-items-center overflow-hidden rounded-xl border border-white/15 bg-white/[.03]">
              <span className="absolute bottom-2 left-2 h-4 w-1.5 bg-[#b5ff55]" />
              <span className="absolute bottom-2 left-[17px] h-6 w-1.5 bg-[#7d72ff]" />
              <span className="absolute bottom-2 right-2 h-3 w-1.5 bg-[#ff7557]" />
            </span>
            <span className="devcity-brand-copy hidden sm:block">
              <strong className="block text-base font-semibold tracking-[-.04em]">
                DevCity
              </strong>
              <small className="block font-mono text-[16px] uppercase tracking-[.14em] text-zinc-500">
                repository urbanizer
              </small>
            </span>
          </a>

          <form
            className="repository-form relative mx-auto flex min-w-0 max-w-2xl flex-1 items-center rounded-xl border border-white/10 bg-black/20 p-1"
            onSubmit={(event) => {
              event.preventDefault();
              void analyze();
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setRepositoryMenuOpen(false);
              }
            }}
          >
            <span className="hidden px-2 font-mono text-[12px] text-[#b5ff55] md:block">
              GITHUB /
            </span>
            <input
              className="repository-input min-w-0 flex-1 bg-transparent px-2 py-2 text-[14px] text-white outline-none placeholder:text-zinc-600"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setRepositoryMenuOpen(true);
              }}
              onFocus={() => {
                if (repositoryQuery) setRepositoryMenuOpen(true);
              }}
              placeholder="owner/repository"
              aria-label="Repositório GitHub"
              role="combobox"
              aria-expanded={repositoryMenuOpen && Boolean(repositoryQuery)}
              aria-controls="repository-options"
              aria-autocomplete="list"
              autoComplete="off"
            />
            <button
              className="build-city-button rounded-lg bg-[#b5ff55] px-4 py-2 text-[12px] font-bold uppercase tracking-[.08em] text-[#071006] transition hover:bg-[#c8ff7c] disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Scanning…' : 'Build city'}
            </button>

            {repositoryMenuOpen && repositoryQuery ? (
              <div
                id="repository-options"
                className="repository-options absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-xl border border-white/10 bg-[#0b0e14]/98 shadow-2xl backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/[.08] px-3 py-2.5">
                  <span className="font-mono text-[16px] uppercase tracking-[.12em] text-zinc-500">
                    {repositoryQuery.owner} / repositories
                  </span>
                  <span className="font-mono text-[16px] text-zinc-600">
                    {repositoryLoading
                      ? 'loading…'
                      : repositoryOptions.length + ' found'}
                  </span>
                </div>

                <div className="max-h-[330px] overflow-y-auto p-1.5">
                  {repositoryLoading ? (
                    <div className="px-3 py-5 text-center font-mono text-[14px] uppercase tracking-[.1em] text-zinc-600">
                      Buscando repositórios…
                    </div>
                  ) : filteredRepositoryOptions.length > 0 ? (
                    filteredRepositoryOptions.map((repository) => (
                      <button
                        key={repository.fullName}
                        type="button"
                        className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[.055] focus:bg-white/[.055] focus:outline-none"
                        onClick={() => {
                          setInput(repository.fullName);
                          setRepositoryMenuOpen(false);
                          void analyze(repository.fullName);
                        }}
                      >
                        <span className="min-w-0">
                          <strong className="block truncate text-[16px] text-white">
                            {repository.name}
                          </strong>
                          <small className="mt-1 block truncate text-[14px] text-zinc-500">
                            {repository.description ?? 'Sem descrição'}
                          </small>
                        </span>
                        <span className="flex items-center gap-2 font-mono text-[16px] text-zinc-500">
                          {repository.language ? (
                            <i className="not-italic text-zinc-400">
                              {repository.language}
                            </i>
                          ) : null}
                          <b className="font-normal">★ {repository.stars}</b>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-5 text-center text-[12px] text-zinc-600">
                      Nenhum repositório encontrado.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </form>

          <div className="hidden items-center gap-2 font-mono text-[14px] uppercase tracking-[.1em] text-zinc-500 xl:flex">
            <i className="size-1.5 rounded-full bg-[#b5ff55] shadow-[0_0_14px_#b5ff55]" />
            {notice}
          </div>
        </div>
      </header>

      <section className="city-stage absolute inset-0 pt-[72px]">
        <div className="city-toolbar absolute inset-x-0 top-[72px] z-30 flex min-h-[64px] items-center justify-between gap-4 border-b border-white/[.07] bg-[#090b10]/75 px-4 backdrop-blur-md lg:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <div className="min-w-0">
              <span className="font-mono text-[16px] uppercase tracking-[.13em] text-zinc-500">
                ACTIVE REPOSITORY
              </span>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <strong className="truncate text-[16px] tracking-[-.03em] text-white">
                  {snapshot.owner}/{snapshot.repo}
                </strong>
                <a
                  href={snapshot.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[14px] text-[#7d72ff] hover:text-white"
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

          <div className="city-toolbar-actions flex shrink-0 items-center gap-2">
            <div className="hidden rounded-lg border border-white/10 bg-black/20 p-1 sm:flex">
              <button
                className={
                  'rounded-md px-2.5 py-1.5 font-mono text-[16px] uppercase tracking-[.08em] transition ' +
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
                  'rounded-md px-2.5 py-1.5 font-mono text-[16px] uppercase tracking-[.08em] transition ' +
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
              className="mobile-toolbar-button hidden rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 font-mono text-[16px] uppercase tracking-[.08em] text-zinc-300"
              type="button"
              onClick={() =>
                setMobilePanel((current) =>
                  current === 'filters' ? 'none' : 'filters',
                )
              }
              aria-expanded={mobilePanel === 'filters'}
            >
              Filtros
            </button>
            <button
              className="mobile-toolbar-button hidden rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 font-mono text-[16px] uppercase tracking-[.08em] text-zinc-300 disabled:opacity-35"
              type="button"
              disabled={!selected}
              onClick={() =>
                setMobilePanel((current) =>
                  current === 'inspector' ? 'none' : 'inspector',
                )
              }
              aria-expanded={mobilePanel === 'inspector'}
            >
              Arquivo
            </button>
            <button
              className="reset-view-button rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 font-mono text-[16px] uppercase tracking-[.08em] text-zinc-400 transition hover:border-white/20 hover:text-white"
              type="button"
              onClick={() => {
                setNavigationIntent(IDLE_NAVIGATION);
                setCameraKey((value) => value + 1);
              }}
            >
              Reset view
            </button>
          </div>
        </div>

        <div className="city-canvas-shell absolute inset-x-0 bottom-0 top-[136px]">
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 rounded-xl border border-white/10 bg-[#090c12]/78 px-3 py-2 font-mono text-[16px] uppercase tracking-[.08em] text-zinc-500 shadow-xl backdrop-blur-md md:block">
            <span className="text-zinc-300">WASD / ARROWS</span> mover
            <i className="mx-2 text-zinc-700">·</i>
            <span className="text-zinc-300">Q / E</span> altura
            <i className="mx-2 text-zinc-700">·</i>
            <span className="text-zinc-300">SHIFT</span> turbo
            <i className="mx-2 text-zinc-700">·</i>
            mouse direito pan
          </div>

          <Canvas
            shadows
            dpr={[1, 1.5]}
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
              navigationIntent={navigationIntent}
              onSelectBuilding={() => setMobilePanel('inspector')}
            />
          </Canvas>
          <div className="mobile-navigation" aria-label="Controles móveis da cidade">
            <div className="mobile-dpad">
              <MovementButton
                label="↑"
                className="mobile-move-up"
                intent={{ forward: 1, strafe: 0, vertical: 0, boost: false }}
                onChange={setNavigationIntent}
              />
              <MovementButton
                label="←"
                className="mobile-move-left"
                intent={{ forward: 0, strafe: -1, vertical: 0, boost: false }}
                onChange={setNavigationIntent}
              />
              <span className="mobile-dpad-center" aria-hidden="true">◆</span>
              <MovementButton
                label="→"
                className="mobile-move-right"
                intent={{ forward: 0, strafe: 1, vertical: 0, boost: false }}
                onChange={setNavigationIntent}
              />
              <MovementButton
                label="↓"
                className="mobile-move-down"
                intent={{ forward: -1, strafe: 0, vertical: 0, boost: false }}
                onChange={setNavigationIntent}
              />
            </div>
            <div className="mobile-altitude">
              <MovementButton
                label="+"
                intent={{ forward: 0, strafe: 0, vertical: 1, boost: false }}
                onChange={setNavigationIntent}
              />
              <MovementButton
                label="−"
                intent={{ forward: 0, strafe: 0, vertical: -1, boost: false }}
                onChange={setNavigationIntent}
              />
            </div>
            <span className="mobile-touch-hint">arraste: girar · pinça: zoom/pan</span>
          </div>

        </div>
      </section>

      <aside
        className="city-index-panel absolute bottom-4 left-4 z-40 w-[min(330px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e14]/88 shadow-2xl backdrop-blur-xl lg:bottom-6 lg:left-6"
        data-mobile-open={mobilePanel === 'filters'}
      >
        <div className="border-b border-white/10 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <button
              className="mobile-sheet-close hidden font-mono text-[14px] text-zinc-500"
              type="button"
              onClick={() => setMobilePanel('none')}
            >
              FECHAR
            </button>
            <span className="font-mono text-[16px] uppercase tracking-[.13em] text-zinc-500">
              CITY INDEX
            </span>
            <span className="font-mono text-[16px] text-zinc-600">
              {model.renderedFiles}/{model.totalFiles}
            </span>
          </div>

          <div className="mobile-color-modes hidden">
            <button
              type="button"
              data-active={colorMode === 'language'}
              onClick={() => dispatch(setColorMode('language'))}
            >
              Language
            </button>
            <button
              type="button"
              data-active={colorMode === 'size'}
              onClick={() => dispatch(setColorMode('size'))}
            >
              Size heat
            </button>
          </div>

          <label className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5">
            <span className="text-zinc-600">⌕</span>
            <input
              className="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-white outline-none placeholder:text-zinc-600"
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
                    'inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[16px] transition ' +
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

      <aside
        className="building-inspector-panel absolute bottom-4 right-4 z-40 w-[min(350px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e14]/90 shadow-2xl backdrop-blur-xl lg:bottom-6 lg:right-6"
        data-mobile-open={mobilePanel === 'inspector'}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
          <div className="min-w-0">
            <span className="font-mono text-[16px] uppercase tracking-[.13em] text-zinc-500">
              BUILDING INSPECTOR
            </span>
            <h2 className="mt-1 truncate text-[18px] font-semibold tracking-[-.04em] text-white">
              {selected?.name ?? 'Select a building'}
            </h2>
          </div>

          {selected ? (
            <button
              type="button"
              className="font-mono text-[14px] text-zinc-500 hover:text-white"
              onClick={() => {
                dispatch(selectBuilding(null));
                setMobilePanel('none');
              }}
            >
              CLOSE
            </button>
          ) : null}
        </div>

        {selected ? (
          <div className="space-y-4 p-4">
            <p className="break-all font-mono text-[12px] leading-5 text-zinc-400">
              {selected.path}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/[.08] bg-white/[.025] p-2.5">
                <span className="block font-mono text-[12px] uppercase tracking-[.1em] text-zinc-600">
                  HEIGHT
                </span>
                <strong className="mt-1 block text-[14px] text-white">
                  {selected.dimensions[1].toFixed(1)}
                </strong>
              </div>
              <div className="rounded-lg border border-white/[.08] bg-white/[.025] p-2.5">
                <span className="block font-mono text-[12px] uppercase tracking-[.1em] text-zinc-600">
                  SIZE
                </span>
                <strong className="mt-1 block text-[14px] text-white">
                  {formatBytes(selected.size)}
                </strong>
              </div>
              <div className="rounded-lg border border-white/[.08] bg-white/[.025] p-2.5">
                <span className="block font-mono text-[12px] uppercase tracking-[.1em] text-zinc-600">
                  TYPE
                </span>
                <strong className="mt-1 block truncate text-[14px] text-white">
                  {selected.extension || 'file'}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/[.08] pt-3">
              <span className="inline-flex items-center gap-2 font-mono text-[14px] text-zinc-400">
                <i
                  className="size-2 rounded-full"
                  style={{ background: selected.color }}
                />
                {selected.language}
              </span>
              <span className="font-mono text-[16px] uppercase tracking-[.1em] text-zinc-600">
                DISTRICT / {selected.district}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid min-h-[105px] place-items-center rounded-xl border border-dashed border-white/10 bg-white/[.015] text-center">
              <div>
                <span className="mx-auto grid size-8 place-items-center rounded-full bg-[#b5ff55] text-[16px] text-[#071006]">
                  ↖
                </span>
                <p className="mt-2 text-[12px] leading-4 text-zinc-500">
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
            <strong className="mt-4 block text-base tracking-[-.03em]">
              Urbanizando repositório
            </strong>
            <small className="mt-1 block font-mono text-[16px] uppercase tracking-[.13em] text-zinc-500">
              reading tree / zoning / extruding
            </small>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute left-1/2 top-[148px] z-50 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-red-400/20 bg-red-950/80 p-3 text-[16px] text-red-100 shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <p className="m-0 leading-5">{error}</p>
            <button
              type="button"
              className="font-mono text-[14px] text-red-300"
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
