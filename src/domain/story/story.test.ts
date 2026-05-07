import { beforeEach, describe, expect, test } from 'bun:test'
import { cardPool } from '../cards/cardPool'
import { createDefaultProfile } from '../progression/profile'
import {
  applyStoryVictoryRewards,
  createInitialStoryProgress,
  getFacingStoryTrainer,
  getStoryTile,
  isStoryMapCompleted,
  listStoryTrainerFragmentCardIds,
  listStoryChapters,
  listStoryLeagueStages,
  listStoryMaps,
  listStoryTrainers,
  loadStoryProgress,
  markStoryTrainerDefeated,
  moveStoryPlayer,
  resolveStoryMapExit,
  resolveStoryTrainerFragmentReward,
  resolveStoryLocalCollection,
  resolveStoryMap,
  resolveStoryTrainer,
  resolveStoryZoneReward,
  saveStoryProgress,
  STORY_PROGRESS_STORAGE_KEY,
  type StoryDirection,
  type StoryMap,
  type StoryPoint,
} from './story'

describe('story mode domain', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('migrates old KH story progress into PokeTriad storage', () => {
    const legacyStoryProgressStorageKey = 'kh-triple-triad-story-progress-v1'
    const progress = markStoryTrainerDefeated(createInitialStoryProgress(), 'route-kid')

    localStorage.setItem(legacyStoryProgressStorageKey, JSON.stringify(progress))

    expect(STORY_PROGRESS_STORAGE_KEY).toBe('poketriad-story-progress-v1')
    expect(loadStoryProgress().defeatedTrainerIds).toContain('route-kid')

    saveStoryProgress(progress)
    expect(localStorage.getItem(STORY_PROGRESS_STORAGE_KEY)).toBeTruthy()
  })

  test('lists story maps available for the selector as immutable entries', () => {
    const maps = listStoryMaps()

    expect(maps.map((map) => map.id)).toEqual(['pallet-town', 'route-1', 'argenta-gym', 'azuria', 'mont-selenite', 'azuria-gym'])
    expect(maps[0]).toMatchObject({
      id: 'pallet-town',
      name: 'Bourg Palette',
      backgroundImage: '/story/gen1/pallet-town.png',
      music: {
        id: 'pallet-town-theme',
        label: 'Theme Bourg Palette',
      },
    })
    expect(maps[1]).toMatchObject({
      id: 'route-1',
      name: 'Route 1',
      backgroundImage: '/story/gen1/route-1.png',
      playerStart: { x: 7, y: 16 },
    })
    expect(maps[2]).toMatchObject({
      id: 'argenta-gym',
      name: "Arène d'Argenta",
      backgroundImage: '/story/gen1/argenta-gym.png',
      playerStart: { x: 6, y: 14 },
    })
    expect(maps[3]).toMatchObject({
      id: 'azuria',
      name: 'Azuria',
      backgroundImage: '/story/gen1/azuria.png',
      playerStart: { x: 0, y: 12 },
    })
    expect(maps[4]).toMatchObject({
      id: 'mont-selenite',
      name: 'Mont Sélénite',
      backgroundImage: '/story/gen1/mont-selenite.png',
      playerStart: { x: 3, y: 3 },
    })
    expect(maps[5]).toMatchObject({
      id: 'azuria-gym',
      name: "Arène d'Azuria",
      backgroundImage: '/story/gen1/azuria-gym.png',
      playerStart: { x: 8, y: 18 },
    })
    maps[0].playerStart.x = 0
    expect(resolveStoryMap('pallet-town').playerStart).toEqual({ x: 9, y: 15 })
    maps[1].playerStart.x = 0
    expect(resolveStoryMap('route-1').playerStart).toEqual({ x: 7, y: 16 })
    maps[2].playerStart.x = 0
    expect(resolveStoryMap('argenta-gym').playerStart).toEqual({ x: 6, y: 14 })
    maps[3].playerStart.x = 0
    expect(resolveStoryMap('azuria').playerStart).toEqual({ x: 0, y: 12 })
    maps[4].playerStart.x = 0
    expect(resolveStoryMap('mont-selenite').playerStart).toEqual({ x: 3, y: 3 })
    maps[5].playerStart.x = 0
    expect(resolveStoryMap('azuria-gym').playerStart).toEqual({ x: 8, y: 18 })
  })

  test('lists the Kanto story hub in the original badge and league arc', () => {
    const chapters = listStoryChapters()
    const leagueStages = listStoryLeagueStages()

    expect(chapters).toHaveLength(8)
    expect(chapters.map((chapter) => chapter.badge)).toEqual(['Roche', 'Cascade', 'Foudre', 'Prisme', 'Âme', 'Marais', 'Volcan', 'Terre'])
    expect(chapters.map((chapter) => chapter.route)).toEqual([
      'Route 1',
      'Mont Sélénite',
      'Route 6',
      'Repaire Rocket',
      'Piste cyclable',
      'Safari',
      'Chenal 19',
      'Route 22',
    ])
    expect(chapters[0]).toMatchObject({
      id: 'badge-rock',
      city: 'Bourg Palette',
      route: 'Route 1',
      arena: 'Arène d’Argenta',
      champion: 'Pierre',
      mapId: 'pallet-town',
    })
    expect(chapters[7]).toMatchObject({
      city: 'Jadielle',
      arena: 'Arène de Jadielle',
      champion: 'Giovanni',
    })
    expect(chapters.map((chapter) => chapter.mapId)).toEqual(['pallet-town', 'azuria', undefined, undefined, undefined, undefined, undefined, undefined])
    expect(chapters.slice(2).every((chapter) => chapter.zones.every((zone) => zone.mapId === undefined))).toBe(true)
    expect(leagueStages.map((stage) => stage.opponent)).toEqual(['Olga', 'Aldo', 'Agatha', 'Peter', 'Régis'])

    chapters[0].city = 'Mutated'
    expect(listStoryChapters()[0].city).toBe('Bourg Palette')
  })

  test('lists chapter zones before entering a playable map', () => {
    const [firstChapter, cascadeChapter] = listStoryChapters()

    expect(firstChapter.zones.map((zone) => ({ id: zone.id, kind: zone.kind, name: zone.name, mapId: zone.mapId }))).toEqual([
      { id: 'badge-rock-city', kind: 'city', name: 'Bourg Palette', mapId: 'pallet-town' },
      { id: 'badge-rock-route', kind: 'route', name: 'Route 1', mapId: 'route-1' },
      { id: 'badge-rock-arena', kind: 'arena', name: 'Arène d’Argenta', mapId: 'argenta-gym' },
    ])
    expect(cascadeChapter.zones.map((zone) => ({ id: zone.id, kind: zone.kind, name: zone.name, mapId: zone.mapId }))).toEqual([
      { id: 'badge-cascade-city', kind: 'city', name: 'Azuria', mapId: 'azuria' },
      { id: 'badge-cascade-route', kind: 'route', name: 'Mont Sélénite', mapId: 'mont-selenite' },
      { id: 'badge-cascade-arena', kind: 'arena', name: 'Arène d’Azuria', mapId: 'azuria-gym' },
    ])

    firstChapter.zones[0].name = 'Mutated'
    expect(listStoryChapters()[0].zones[0].name).toBe('Bourg Palette')
  })

  test('resolves a playable Pallet Town vertical slice with unique trainer ids', () => {
    const map = resolveStoryMap('pallet-town')
    const trainers = listStoryTrainers(map.id)

    expect(map.id).toBe('pallet-town')
    expect(map.width).toBeGreaterThan(8)
    expect(map.height).toBeGreaterThan(8)
    expect(map.terrain.size).toBe(map.width * map.height)
    expect(map.walkable.has(`${map.playerStart.x},${map.playerStart.y}`)).toBe(true)
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        expect(map.terrain.has(`${x},${y}`)).toBe(true)
      }
    }
    expect(new Set(trainers.map((trainer) => trainer.id)).size).toBe(trainers.length)
    expect(trainers.length).toBeGreaterThanOrEqual(3)
    expect(trainers[0]).toMatchObject({
      battlePrompt: 'Clique sur Defier pour lancer le duel.',
    })
  })

  test('resolves Route 1 as its own playable path north from Pallet Town', () => {
    const map = resolveStoryMap('route-1')
    const trainers = listStoryTrainers(map.id)

    expect(map).toMatchObject({
      id: 'route-1',
      name: 'Route 1',
      width: 16,
      height: 17,
      tileSize: 16,
      backgroundImage: '/story/gen1/route-1.png',
      playerStart: { x: 7, y: 16 },
    })
    expect(map.terrain.size).toBe(map.width * map.height)
    expect(map.walkable.has('7,16')).toBe(true)
    expect(map.walkable.has('6,0')).toBe(true)
    expect(getStoryTile(map, { x: 0, y: 1 })).toMatchObject({ passable: false, terrain: 'border' })
    expect(getStoryTile(map, { x: 6, y: 9 })).toMatchObject({ passable: false, terrain: 'sign' })
    expect(getStoryTile(map, { x: 9, y: 4 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(moveStoryPlayer(map, map.playerStart, 'up')).toMatchObject({ x: 7, y: 15, moved: true })
    expect(moveStoryPlayer(map, { x: 1, y: 1 }, 'left')).toMatchObject({ x: 1, y: 1, moved: false, blockedBy: 'border' })
    expect(trainers.map((trainer) => trainer.id)).toEqual(['route-1-scout', 'route-1-bug-catcher', 'route-1-lass'])
  })

  test('classifies Route 1 walkable lanes, ledges, trees and sign from the real map', () => {
    const map = resolveStoryMap('route-1')

    expect(getStoryTile(map, { x: 6, y: 0 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 0, y: 0 })).toMatchObject({ passable: false, terrain: 'border' })
    expect(getStoryTile(map, { x: 7, y: 0 })).toMatchObject({ passable: false, terrain: 'fence' })
    expect(getStoryTile(map, { x: 9, y: 4 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 8, y: 4 })).toMatchObject({ passable: false, terrain: 'fence' })
    expect(getStoryTile(map, { x: 5, y: 8 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 6, y: 8 })).toMatchObject({ passable: false, terrain: 'fence' })
    expect(getStoryTile(map, { x: 6, y: 9 })).toMatchObject({ passable: false, terrain: 'sign' })
    expect(getStoryTile(map, { x: 7, y: 13 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 6, y: 13 })).toMatchObject({ passable: false, terrain: 'fence' })
  })

  test('keeps Route 1 connected and puts every route trainer on an interactable passable tile', () => {
    const map = resolveStoryMap('route-1')
    const trainers = listStoryTrainers(map.id)
    const trainerPositions = new Set(trainers.map((trainer) => `${trainer.position.x},${trainer.position.y}`))

    expect(hasWalkablePath(map, map.playerStart, { x: 6, y: 0 })).toBe(true)

    for (const trainer of trainers) {
      const trainerTile = getStoryTile(map, trainer.position)
      expect(trainerTile.passable).toBe(true)
      expect(trainerPositions.size).toBe(trainers.length)
      expect(hasAdjacentWalkableTile(map, trainer.position)).toBe(true)
      expect(moveStoryPlayer(map, { x: trainer.position.x, y: trainer.position.y + 1 }, 'up')).toMatchObject({
        moved: false,
        blockedBy: 'trainer',
        trainerId: trainer.id,
      })
    }
  })

  test('resolves walkable edge exits toward adjacent story zones', () => {
    expect(resolveStoryMapExit(resolveStoryMap('pallet-town'), { x: 10, y: 0 }, 'up')).toEqual({
      mapId: 'route-1',
      playerStart: { x: 7, y: 16 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('pallet-town'), { x: 11, y: 0 }, 'up')).toEqual({
      mapId: 'route-1',
      playerStart: { x: 8, y: 16 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('route-1'), { x: 7, y: 16 }, 'down')).toEqual({
      mapId: 'pallet-town',
      playerStart: { x: 10, y: 0 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('route-1'), { x: 8, y: 16 }, 'down')).toEqual({
      mapId: 'pallet-town',
      playerStart: { x: 11, y: 0 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('route-1'), { x: 6, y: 0 }, 'up')).toEqual({
      mapId: 'argenta-gym',
      playerStart: { x: 6, y: 14 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('argenta-gym'), { x: 5, y: 15 }, 'down')).toEqual({
      mapId: 'route-1',
      playerStart: { x: 6, y: 0 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('argenta-gym'), { x: 7, y: 15 }, 'down')).toEqual({
      mapId: 'route-1',
      playerStart: { x: 6, y: 0 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('route-1'), { x: 0, y: 1 }, 'left')).toBeNull()
    expect(resolveStoryMapExit(resolveStoryMap('pallet-town'), { x: 10, y: 1 }, 'up')).toBeNull()
    expect(resolveStoryMapExit(resolveStoryMap('mont-selenite'), { x: 3, y: 4 }, 'down')).toEqual({
      mapId: 'azuria',
      playerStart: { x: 7, y: 21 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('mont-selenite'), { x: 3, y: 4 }, 'up')).toBeNull()
    expect(resolveStoryMapExit(resolveStoryMap('mont-selenite'), { x: 15, y: 16 }, 'down')).toEqual({
      mapId: 'azuria',
      playerStart: { x: 7, y: 21 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('mont-selenite'), { x: 15, y: 16 }, 'up')).toBeNull()
    expect(resolveStoryMapExit(resolveStoryMap('mont-selenite'), { x: 8, y: 4 }, 'left')).toBeNull()
    expect(resolveStoryMapExit(resolveStoryMap('azuria'), { x: 7, y: 22 }, 'down')).toEqual({
      mapId: 'mont-selenite',
      playerStart: { x: 15, y: 15 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('azuria'), { x: 2, y: 22 }, 'down')).toBeNull()
    expect(resolveStoryMapExit(resolveStoryMap('azuria'), { x: 31, y: 14 }, 'up')).toEqual({
      mapId: 'azuria-gym',
      playerStart: { x: 8, y: 18 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('azuria'), { x: 31, y: 14 }, 'right')).toBeNull()
    expect(resolveStoryMapExit(resolveStoryMap('azuria-gym'), { x: 8, y: 19 }, 'down')).toEqual({
      mapId: 'azuria',
      playerStart: { x: 31, y: 14 },
    })
    expect(resolveStoryMapExit(resolveStoryMap('azuria-gym'), { x: 8, y: 19 }, 'up')).toBeNull()
  })

  test('keeps map travel round-trips beside the matching exits instead of bouncing immediately', () => {
    const azuria = resolveStoryMap('azuria')
    const montSelenite = resolveStoryMap('mont-selenite')
    const azuriaGym = resolveStoryMap('azuria-gym')

    expect(resolveStoryMapExit(azuria, { x: 7, y: 22 }, 'down')).toEqual({
      mapId: 'mont-selenite',
      playerStart: { x: 15, y: 15 },
    })
    expect(resolveStoryMapExit(azuria, { x: 7, y: 21 }, 'down')).toBeNull()
    expect(resolveStoryMapExit(montSelenite, { x: 3, y: 3 }, 'up')).toBeNull()
    expect(resolveExitAfterStep(montSelenite, { x: 3, y: 3 }, 'down')).toEqual({
      mapId: 'azuria',
      playerStart: { x: 7, y: 21 },
    })
    expect(resolveExitAfterStep(azuria, { x: 7, y: 21 }, 'down')).toEqual({
      mapId: 'mont-selenite',
      playerStart: { x: 15, y: 15 },
    })

    expect(resolveExitAfterStep(montSelenite, { x: 15, y: 15 }, 'down')).toEqual({
      mapId: 'azuria',
      playerStart: { x: 7, y: 21 },
    })
    expect(resolveStoryMapExit(azuria, { x: 31, y: 14 }, 'up')).toEqual({
      mapId: 'azuria-gym',
      playerStart: { x: 8, y: 18 },
    })
    expect(resolveStoryMapExit(azuriaGym, { x: 8, y: 18 }, 'up')).toBeNull()
    expect(resolveExitAfterStep(azuriaGym, { x: 8, y: 18 }, 'down')).toEqual({
      mapId: 'azuria',
      playerStart: { x: 31, y: 14 },
    })
    expect(resolveStoryMapExit(azuria, { x: 31, y: 14 }, 'right')).toBeNull()
  })

  test('reuses Lina visuals for Bastien to keep Route 1 trainer sprites coherent', () => {
    const lina = resolveStoryTrainer('route-1-lass')

    expect(resolveStoryTrainer('route-1-bug-catcher')).toMatchObject({
      sprite: lina.sprite,
      portrait: lina.portrait,
      renderMode: 'sprite',
    })
  })

  test("resolves Argenta gym as the playable arena map with Brock's blockers", () => {
    const map = resolveStoryMap('argenta-gym')
    const trainers = listStoryTrainers(map.id)

    expect(map).toMatchObject({
      id: 'argenta-gym',
      name: "Arène d'Argenta",
      width: 13,
      height: 16,
      tileSize: 16,
      backgroundImage: '/story/gen1/argenta-gym.png',
      playerStart: { x: 6, y: 14 },
    })
    expect(map.terrain.size).toBe(map.width * map.height)
    expect(map.walkable.has('6,14')).toBe(true)
    expect(getStoryTile(map, { x: 0, y: 0 })).toMatchObject({ passable: false, terrain: 'border' })
    expect(getStoryTile(map, { x: 6, y: 8 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 4, y: 9 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 4, y: 10 })).toMatchObject({ passable: false, terrain: 'fence' })
    expect(getStoryTile(map, { x: 6, y: 5 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(moveStoryPlayer(map, map.playerStart, 'up')).toMatchObject({ x: 6, y: 13, moved: true })
    expect(trainers.map((trainer) => trainer.id)).toEqual(['argenta-gym-trainer', 'brock'])
    expect(hasWalkablePath(map, map.playerStart, { x: 4, y: 9 })).toBe(true)
    expect(hasWalkablePath(map, map.playerStart, { x: 6, y: 6 })).toBe(true)
    expect(moveStoryPlayer(map, { x: 4, y: 9 }, 'down')).toMatchObject({
      moved: false,
      blockedBy: 'fence',
    })
    expect(moveStoryPlayer(map, { x: 4, y: 9 }, 'left')).toMatchObject({
      moved: false,
      blockedBy: 'trainer',
      trainerId: 'argenta-gym-trainer',
    })
    expect(moveStoryPlayer(map, { x: 6, y: 6 }, 'up')).toMatchObject({
      moved: false,
      blockedBy: 'trainer',
      trainerId: 'brock',
    })
  })

  test('resolves the three Cascade maps with playable terrain and interactable trainers', () => {
    const cascadeMaps = [
      {
        id: 'azuria',
        width: 37,
        height: 23,
        backgroundImage: '/story/gen1/azuria.png',
        playerStart: { x: 0, y: 12 },
        trainerIds: ['azuria-rival', 'azuria-lass', 'azuria-scout', 'azuria-picnicker', 'azuria-collector'],
        passableTile: { x: 23, y: 9 },
        blockedTile: { x: 20, y: 10 },
      },
      {
        id: 'mont-selenite',
        width: 20,
        height: 18,
        backgroundImage: '/story/gen1/mont-selenite.png',
        playerStart: { x: 3, y: 3 },
        trainerIds: ['mont-selenite-hiker', 'mont-selenite-rocket', 'mont-selenite-scientist', 'mont-selenite-scout'],
        passableTile: { x: 15, y: 16 },
        blockedTile: { x: 9, y: 2 },
      },
      {
        id: 'azuria-gym',
        width: 17,
        height: 20,
        backgroundImage: '/story/gen1/azuria-gym.png',
        playerStart: { x: 8, y: 18 },
        trainerIds: ['azuria-gym-trainer', 'azuria-gym-swimmer', 'misty'],
        passableTile: { x: 8, y: 8 },
        blockedTile: { x: 8, y: 4 },
      },
    ] as const

    for (const expectedMap of cascadeMaps) {
      const map = resolveStoryMap(expectedMap.id)
      const trainers = listStoryTrainers(map.id)
      const trainerPositions = new Set(trainers.map((trainer) => `${trainer.position.x},${trainer.position.y}`))

      expect(map).toMatchObject({
        id: expectedMap.id,
        width: expectedMap.width,
        height: expectedMap.height,
        tileSize: 16,
        backgroundImage: expectedMap.backgroundImage,
        playerStart: expectedMap.playerStart,
      })
      expect(map.terrain.size).toBe(map.width * map.height)
      expect(map.walkable.has(`${map.playerStart.x},${map.playerStart.y}`)).toBe(true)
      expect(getStoryTile(map, expectedMap.passableTile)).toMatchObject({ passable: true, terrain: 'road' })
      expect(getStoryTile(map, expectedMap.blockedTile).passable).toBe(false)
      expect(trainers.map((trainer) => trainer.id)).toEqual([...expectedMap.trainerIds])
      expect(trainerPositions.size).toBe(trainers.length)
      expect(resolveStoryZoneReward(map.id).mapId).toBe(map.id)

      for (const trainer of trainers) {
        const trainerTile = getStoryTile(map, trainer.position)
        const adjacentPoint = getAdjacentPoints(trainer.position).find((point) => map.walkable.has(`${point.x},${point.y}`))

        expect(trainerTile.passable).toBe(true)
        expect(adjacentPoint).toBeDefined()
        expect(hasWalkablePath(map, map.playerStart, trainer.position)).toBe(true)
        expect(moveStoryPlayer(map, adjacentPoint!, getDirectionToward(adjacentPoint!, trainer.position)!)).toMatchObject({
          moved: false,
          blockedBy: 'trainer',
          trainerId: trainer.id,
        })
      }
    }
  })

  test('aligns Azuria gym trainer blockers with the visible arena walkway', () => {
    const map = resolveStoryMap('azuria-gym')
    const progress = createInitialStoryProgress()

    expect(getStoryTile(map, { x: 8, y: 4 })).toMatchObject({ passable: false })
    expect(getStoryTile(map, { x: 8, y: 8 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 4, y: 8 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 9, y: 12 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 8, y: 19 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(hasWalkablePath(map, map.playerStart, { x: 8, y: 8 })).toBe(true)
    expect(hasWalkablePath(map, map.playerStart, { x: 5, y: 8 })).toBe(true)
    expect(hasWalkablePath(map, map.playerStart, { x: 9, y: 12 })).toBe(true)
    expect(resolveStoryMapExit(map, { x: 8, y: 19 }, 'down')).toEqual({
      mapId: 'azuria',
      playerStart: { x: 31, y: 14 },
    })
    expect(resolveStoryMapExit(map, { x: 8, y: 19 }, 'up')).toBeNull()

    expect(resolveStoryTrainer('azuria-gym-trainer').position).toEqual({ x: 4, y: 8 })
    expect(resolveStoryTrainer('azuria-gym-swimmer').position).toEqual({ x: 10, y: 12 })
    expect(resolveStoryTrainer('misty').position).toEqual({ x: 8, y: 7 })

    expect(moveStoryPlayer(map, { x: 5, y: 8 }, 'left')).toMatchObject({
      moved: false,
      blockedBy: 'trainer',
      trainerId: 'azuria-gym-trainer',
    })
    expect(moveStoryPlayer(map, { x: 9, y: 12 }, 'right')).toMatchObject({
      moved: false,
      blockedBy: 'trainer',
      trainerId: 'azuria-gym-swimmer',
    })
    expect(moveStoryPlayer(map, { x: 8, y: 8 }, 'up')).toMatchObject({
      moved: false,
      blockedBy: 'trainer',
      trainerId: 'misty',
    })
    expect(getFacingStoryTrainer(map, { x: 5, y: 8 }, 'left', progress)?.id).toBe('azuria-gym-trainer')
    expect(getFacingStoryTrainer(map, { x: 9, y: 12 }, 'right', progress)?.id).toBe('azuria-gym-swimmer')
    expect(getFacingStoryTrainer(map, { x: 8, y: 8 }, 'up', progress)?.id).toBe('misty')
  })

  test('keeps the compact Mont Sélénite crop connected with real cave exits and Crystal trainer sprites', () => {
    const map = resolveStoryMap('mont-selenite')
    const trainers = listStoryTrainers(map.id)

    expect(map).toMatchObject({
      width: 20,
      height: 18,
      playerStart: { x: 3, y: 3 },
    })
    expect(getStoryTile(map, { x: 20, y: 4 })).toMatchObject({ passable: false, terrain: 'border' })
    expect(getStoryTile(map, { x: 3, y: 4 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 15, y: 16 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 1, y: 1 })).toMatchObject({ passable: false, terrain: 'fence' })
    expect(getStoryTile(map, { x: 9, y: 2 })).toMatchObject({ passable: false, terrain: 'fence' })
    expect(hasWalkablePath(map, map.playerStart, { x: 15, y: 16 })).toBe(true)

    expect(resolveStoryMapExit(map, { x: 3, y: 4 }, 'down')).toEqual({
      mapId: 'azuria',
      playerStart: { x: 7, y: 21 },
    })
    expect(resolveStoryMapExit(map, { x: 3, y: 4 }, 'up')).toBeNull()
    expect(resolveStoryMapExit(map, { x: 15, y: 16 }, 'down')).toEqual({
      mapId: 'azuria',
      playerStart: { x: 7, y: 21 },
    })
    expect(resolveStoryMapExit(map, { x: 15, y: 16 }, 'up')).toBeNull()
    expect(moveStoryPlayer(map, map.playerStart, 'up')).toMatchObject({ moved: true, x: 3, y: 2 })

    expect(trainers.map((trainer) => trainer.id)).toEqual([
      'mont-selenite-hiker',
      'mont-selenite-rocket',
      'mont-selenite-scientist',
      'mont-selenite-scout',
    ])
    expect(trainers.map((trainer) => ({ id: trainer.id, sprite: trainer.sprite, position: trainer.position }))).toEqual([
      { id: 'mont-selenite-hiker', sprite: '/story/gen2/cave-trainer.png', position: { x: 7, y: 4 } },
      { id: 'mont-selenite-rocket', sprite: '/story/gen2/cave-trainer.png', position: { x: 12, y: 14 } },
      { id: 'mont-selenite-scientist', sprite: '/story/gen2/cave-trainer.png', position: { x: 15, y: 14 } },
      { id: 'mont-selenite-scout', sprite: '/story/gen2/cave-trainer.png', position: { x: 5, y: 14 } },
    ])
    for (const trainer of trainers) {
      expect(getStoryTile(map, trainer.position)).toMatchObject({ passable: true, terrain: 'road' })
      expect(hasAdjacentWalkableTile(map, trainer.position)).toBe(true)
      expect(hasWalkablePath(map, map.playerStart, trainer.position)).toBe(true)
    }
  })

  test('keeps compact Azuria trainer placements readable with real city collisions', () => {
    const map = resolveStoryMap('azuria')
    const trainers = listStoryTrainers('azuria')

    expect(getStoryTile(map, map.playerStart)).toMatchObject({ passable: true, terrain: 'road' })
    expect(hasWalkablePath(map, map.playerStart, { x: 7, y: 22 })).toBe(true)
    expect(resolveStoryMapExit(map, { x: 7, y: 22 }, 'down')).toEqual({
      mapId: 'mont-selenite',
      playerStart: { x: 15, y: 15 },
    })

    expect(trainers.map((trainer) => ({ id: trainer.id, position: trainer.position }))).toEqual([
      { id: 'azuria-rival', position: { x: 17, y: 13 } },
      { id: 'azuria-lass', position: { x: 8, y: 6 } },
      { id: 'azuria-scout', position: { x: 7, y: 12 } },
      { id: 'azuria-picnicker', position: { x: 22, y: 13 } },
      { id: 'azuria-collector', position: { x: 28, y: 14 } },
    ])

    expect(getStoryTile(map, { x: 0, y: 1 })).toMatchObject({ passable: false, terrain: 'water' })
    expect(getStoryTile(map, { x: 14, y: 8 })).toMatchObject({ passable: false, terrain: 'building' })
    expect(getStoryTile(map, { x: 14, y: 19 })).toMatchObject({ passable: false, terrain: 'building' })
    expect(getStoryTile(map, { x: 23, y: 12 })).toMatchObject({ passable: false, terrain: 'sign' })
    expect(getStoryTile(map, { x: 5, y: 8 })).toMatchObject({ passable: false, terrain: 'fence' })
    expect(getStoryTile(map, { x: 22, y: 13 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 31, y: 14 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 34, y: 18 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(getStoryTile(map, { x: 34, y: 19 })).toMatchObject({ passable: true, terrain: 'road' })
    expect(hasWalkablePath(map, map.playerStart, { x: 31, y: 14 })).toBe(true)
    expect(hasWalkablePath(map, { x: 7, y: 21 }, { x: 31, y: 14 })).toBe(true)
    expect(hasWalkablePath(map, { x: 34, y: 20 }, { x: 31, y: 14 })).toBe(true)
    expect(resolveStoryMapExit(map, { x: 31, y: 14 }, 'up')).toEqual({
      mapId: 'azuria-gym',
      playerStart: { x: 8, y: 18 },
    })
    expect(moveStoryPlayer(map, { x: 14, y: 20 }, 'up')).toMatchObject({
      moved: false,
      blockedBy: 'building',
    })

    for (const trainer of trainers) {
      expect(getStoryTile(map, trainer.position)).toMatchObject({ passable: true, terrain: 'road' })
      expect(hasWalkablePath(map, map.playerStart, trainer.position)).toBe(true)
    }

    expect(moveStoryPlayer(map, { x: 17, y: 12 }, 'down')).toMatchObject({
      moved: false,
      blockedBy: 'trainer',
      trainerId: 'azuria-rival',
    })
    expect(moveStoryPlayer(map, { x: 8, y: 7 }, 'up')).toMatchObject({
      moved: false,
      blockedBy: 'trainer',
      trainerId: 'azuria-lass',
    })
    expect(moveStoryPlayer(map, { x: 6, y: 12 }, 'right')).toMatchObject({
      moved: false,
      blockedBy: 'trainer',
      trainerId: 'azuria-scout',
    })
    expect(moveStoryPlayer(map, { x: 22, y: 12 }, 'down')).toMatchObject({
      moved: false,
      blockedBy: 'trainer',
      trainerId: 'azuria-picnicker',
    })
    expect(moveStoryPlayer(map, { x: 28, y: 15 }, 'up')).toMatchObject({
      moved: false,
      blockedBy: 'trainer',
      trainerId: 'azuria-collector',
    })
  })

  test('blocks movement into collisions and trainers while allowing open tiles', () => {
    const map = resolveStoryMap('pallet-town')
    const trainer = resolveStoryTrainer('route-kid')

    expect(moveStoryPlayer(map, { x: 1, y: 1 }, 'left')).toMatchObject({ x: 1, y: 1, moved: false, blockedBy: 'border' })
    expect(moveStoryPlayer(map, { x: trainer.position.x, y: trainer.position.y + 1 }, 'up')).toMatchObject({
      x: trainer.position.x,
      y: trainer.position.y + 1,
      moved: false,
      blockedBy: 'trainer',
      trainerId: trainer.id,
    })
    expect(moveStoryPlayer(map, map.playerStart, 'left')).toEqual({
      x: map.playerStart.x - 1,
      y: map.playerStart.y,
      moved: true,
      target: { x: map.playerStart.x - 1, y: map.playerStart.y },
      terrain: 'road',
    })
  })

  test('classifies Pallet Town tiles as road or specific obstacle terrain', () => {
    const map = resolveStoryMap('pallet-town')

    expect(getStoryTile(map, map.playerStart)).toMatchObject({ passable: true, terrain: 'road', label: 'Route' })
    expect(getStoryTile(map, { x: 5, y: 4 })).toMatchObject({ passable: false, terrain: 'building', label: 'Batiment' })
    expect(getStoryTile(map, { x: 5, y: 15 })).toMatchObject({ passable: false, terrain: 'water', label: 'Eau' })
    expect(getStoryTile(map, { x: 5, y: 9 })).toMatchObject({ passable: false, terrain: 'fence', label: 'Barriere' })
    expect(getStoryTile(map, { x: 5, y: 10 })).toMatchObject({ passable: true, terrain: 'road', label: 'Route' })
    expect(getStoryTile(map, { x: 7, y: 9 })).toMatchObject({ passable: false, terrain: 'sign', label: 'Panneau' })
    expect(getStoryTile(map, { x: 13, y: 13 })).toMatchObject({ passable: false, terrain: 'sign', label: 'Panneau' })
    expect(getStoryTile(map, { x: 17, y: 13 })).toMatchObject({ passable: true, terrain: 'road', label: 'Route' })
    expect(getStoryTile(map, { x: -1, y: 2 })).toMatchObject({ passable: false, terrain: 'border', label: 'Bord de carte' })
  })

  test('movement reports why a target tile is blocked', () => {
    const map = resolveStoryMap('pallet-town')

    expect(moveStoryPlayer(map, { x: 8, y: 15 }, 'left')).toMatchObject({
      x: 8,
      y: 15,
      moved: false,
      target: { x: 7, y: 15 },
      terrain: 'water',
      blockedBy: 'water',
    })
    expect(moveStoryPlayer(map, { x: 5, y: 6 }, 'up')).toMatchObject({
      x: 5,
      y: 6,
      moved: false,
      target: { x: 5, y: 5 },
      terrain: 'building',
      blockedBy: 'building',
    })
    expect(moveStoryPlayer(map, { x: 10, y: 16 }, 'up')).toMatchObject({
      x: 10,
      y: 16,
      moved: false,
      target: { x: 10, y: 15 },
      terrain: 'road',
      blockedBy: 'trainer',
      trainerId: 'lab-aide',
    })
  })

  test('treats original map sprites and decorations as blocking collision tiles', () => {
    const map = resolveStoryMap('pallet-town')
    const trainers = listStoryTrainers(map.id)

    expect(trainers.find((trainer) => trainer.id === 'route-kid')?.position).toEqual({ x: 4, y: 8 })
    expect(trainers.find((trainer) => trainer.id === 'lab-aide')?.position).toEqual({ x: 10, y: 15 })

    expect(moveStoryPlayer(map, { x: 4, y: 9 }, 'up')).toMatchObject({ x: 4, y: 9, moved: false, blockedBy: 'trainer' })
    expect(moveStoryPlayer(map, { x: 10, y: 16 }, 'up')).toMatchObject({ x: 10, y: 16, moved: false, blockedBy: 'trainer' })
    expect(moveStoryPlayer(map, { x: 3, y: 6 }, 'up')).toMatchObject({ x: 3, y: 6, moved: false, blockedBy: 'sign' })
    expect(moveStoryPlayer(map, { x: 5, y: 6 }, 'up')).toMatchObject({ x: 5, y: 6, moved: false, blockedBy: 'building' })
    expect(moveStoryPlayer(map, { x: 5, y: 10 }, 'up')).toMatchObject({ x: 5, y: 10, moved: false, blockedBy: 'fence' })
    expect(moveStoryPlayer(map, { x: 5, y: 11 }, 'up')).toMatchObject({ x: 5, y: 10, moved: true, terrain: 'road' })
    expect(moveStoryPlayer(map, { x: 7, y: 14 }, 'left')).toMatchObject({ x: 7, y: 14, moved: false, blockedBy: 'water' })
  })

  test('finds the trainer facing the player and records defeated trainers immutably', () => {
    const progress = createInitialStoryProgress()
    const trainer = resolveStoryTrainer('route-kid')

    const facingTrainer = getFacingStoryTrainer(resolveStoryMap('pallet-town'), { x: trainer.position.x, y: trainer.position.y + 1 }, 'up', progress)
    const updated = markStoryTrainerDefeated(progress, trainer.id)

    expect(facingTrainer?.id).toBe(trainer.id)
    expect(progress.defeatedTrainerIds).toEqual([])
    expect(updated.defeatedTrainerIds).toEqual([trainer.id])
    expect(getFacingStoryTrainer(resolveStoryMap('pallet-town'), { x: trainer.position.x, y: trainer.position.y + 1 }, 'up', updated)).toBeNull()
  })

  test('story trainers expose legal 3x3 battle decks from the card pool', () => {
    const cardIds = new Set(cardPool.map((card) => card.id))

    for (const map of listStoryMaps()) {
      for (const trainer of listStoryTrainers(map.id)) {
        expect(trainer.cpuDeck).toHaveLength(5)
        expect(new Set(trainer.cpuDeck).size).toBe(5)
        expect(trainer.cpuDeck.every((cardId) => cardIds.has(cardId))).toBe(true)
        expect(trainer.rewardGold).toBeGreaterThan(0)
      }
    }
  })

  test('keeps the first two playable worlds on a steadier trainer difficulty curve', () => {
    const trainerScores = new Map(
      listStoryMaps().flatMap((map) =>
        listStoryTrainers(map.id).map((trainer) => [trainer.id, getStoryDeckScore(trainer.cpuDeck)] as const),
      ),
    )
    const expectedScoreBands = [
      ['route-kid', 20, 26],
      ['lab-aide', 34, 42],
      ['rival-blue', 40, 48],
      ['route-1-scout', 24, 32],
      ['route-1-bug-catcher', 32, 40],
      ['route-1-lass', 34, 42],
      ['argenta-gym-trainer', 42, 50],
      ['brock', 54, 60],
      ['azuria-rival', 56, 62],
      ['azuria-lass', 42, 50],
      ['azuria-scout', 42, 50],
      ['azuria-picnicker', 42, 50],
      ['azuria-collector', 44, 52],
      ['mont-selenite-hiker', 46, 54],
      ['mont-selenite-rocket', 46, 54],
      ['mont-selenite-scientist', 46, 54],
      ['mont-selenite-scout', 46, 54],
      ['azuria-gym-trainer', 50, 58],
      ['azuria-gym-swimmer', 52, 60],
      ['misty', 64, 70],
    ] as const

    for (const [trainerId, minScore, maxScore] of expectedScoreBands) {
      const score = trainerScores.get(trainerId)
      expect(score).toBeGreaterThanOrEqual(minScore)
      expect(score).toBeLessThanOrEqual(maxScore)
    }

    expect(trainerScores.get('misty')).toBeGreaterThan(trainerScores.get('brock') ?? 0)
  })

  test('resolves story trainer fragment rewards by preferring cards not yet owned', () => {
    const trainer = resolveStoryTrainer('lab-aide')

    expect(resolveStoryTrainerFragmentReward(trainer, ['c03', 'c10'], 0)).toBe('c11')
    expect(resolveStoryTrainerFragmentReward(trainer, trainer.cpuDeck, 2)).toBe('c11')
  })

  test('builds local story collections from trainer fragment pools and player progress', () => {
    const profile = createDefaultProfile()
    profile.ownedCardIds = ['c01']
    profile.cardCopiesById = { c01: 1 }
    profile.cardFragmentsById = { c04: 2, c07: 3 }

    const blue = resolveStoryTrainer('rival-blue')
    const collection = resolveStoryLocalCollection('pallet-town', profile)

    expect(listStoryTrainerFragmentCardIds(blue)).toEqual(['c01', 'c04', 'c07', 'c25', 'c26'])
    expect(collection.mapId).toBe('pallet-town')
    expect(collection.totalCount).toBeGreaterThanOrEqual(15)
    expect(collection.entries.find((entry) => entry.cardId === 'c01')).toMatchObject({
      trainerIds: ['rival-blue'],
      fragmentCount: 0,
      completed: true,
    })
    expect(collection.entries.find((entry) => entry.cardId === 'c04')).toMatchObject({
      trainerIds: ['rival-blue'],
      fragmentCount: 2,
      completed: false,
    })
    expect(collection.entries.find((entry) => entry.cardId === 'c07')).toMatchObject({
      trainerIds: ['rival-blue'],
      fragmentCount: 3,
      completed: true,
    })
    expect(collection.completedCount).toBe(2)
  })

  test('applies story trainer rewards with replayable local fragments and one-time gold', () => {
    const profile = createDefaultProfile()
    profile.gold = 0
    profile.ownedCardIds = []
    profile.cardCopiesById = {}
    profile.cardFragmentsById = {}

    const progressBeforeLastTrainer = markStoryTrainerDefeated(
      markStoryTrainerDefeated(createInitialStoryProgress(), 'route-kid'),
      'lab-aide',
    )
    const trainer = resolveStoryTrainer('rival-blue')
    const zoneReward = resolveStoryZoneReward('pallet-town')

    const result = applyStoryVictoryRewards(profile, progressBeforeLastTrainer, trainer, 0)

    expect(isStoryMapCompleted(result.progress, 'pallet-town')).toBe(true)
    expect(result.progress.defeatedTrainerIds).toEqual(['route-kid', 'lab-aide', 'rival-blue'])
    expect(result.progress.claimedZoneRewardMapIds).toEqual(['pallet-town'])
    expect(result.summary.fragmentCardId).toBe('c01')
    expect(result.summary.trainerGoldAwarded).toBe(48)
    expect(result.summary.zoneReward).toEqual(zoneReward)
    expect(result.profile.gold).toBe(48 + zoneReward.gold)
    expect(result.profile.cardFragmentsById.c01).toBe(1)
    expect(result.profile.ownedCardIds).toContain(zoneReward.cardId)
    expect(result.profile.cardCopiesById[zoneReward.cardId]).toBe(1)
    expect(result.profile.achievementProgress.cardsAcquired).toBe(1)

    const replay = applyStoryVictoryRewards(result.profile, result.progress, trainer, 1)
    expect(replay.summary.fragmentCardId).toBe('c07')
    expect(replay.summary.zoneReward).toBeNull()
    expect(replay.profile.gold).toBe(result.profile.gold)
    expect(replay.profile.cardFragmentsById.c07).toBe(1)
  })
})

function hasWalkablePath(map: StoryMap, start: StoryPoint, target: StoryPoint): boolean {
  const queue: StoryPoint[] = [{ ...start }]
  const seen = new Set<string>([`${start.x},${start.y}`])

  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index]
    if (point.x === target.x && point.y === target.y) {
      return true
    }

    for (const nextPoint of getAdjacentPoints(point)) {
      const key = `${nextPoint.x},${nextPoint.y}`
      if (seen.has(key) || !map.walkable.has(key)) {
        continue
      }
      seen.add(key)
      queue.push(nextPoint)
    }
  }

  return false
}

function resolveExitAfterStep(map: StoryMap, position: StoryPoint, direction: StoryDirection) {
  const moveResult = moveStoryPlayer(map, position, direction)
  const exitPosition = moveResult.moved ? { x: moveResult.x, y: moveResult.y } : position
  return resolveStoryMapExit(map, exitPosition, direction)
}

function getStoryDeckScore(cardIds: readonly string[]): number {
  return cardIds.reduce((sum, cardId) => {
    const card = cardPool.find((entry) => entry.id === cardId)
    if (!card) {
      throw new Error(`Unknown card id: ${cardId}`)
    }
    return sum + card.top + card.right + card.bottom + card.left
  }, 0)
}

function hasAdjacentWalkableTile(map: StoryMap, point: StoryPoint): boolean {
  return getAdjacentPoints(point).some((adjacentPoint) => map.walkable.has(`${adjacentPoint.x},${adjacentPoint.y}`))
}

function getAdjacentPoints(point: StoryPoint): StoryPoint[] {
  return [
    { x: point.x, y: point.y - 1 },
    { x: point.x + 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x - 1, y: point.y },
  ]
}

function getDirectionToward(from: StoryPoint, to: StoryPoint): 'up' | 'right' | 'down' | 'left' | null {
  if (from.x === to.x && from.y === to.y + 1) {
    return 'up'
  }
  if (from.x === to.x - 1 && from.y === to.y) {
    return 'right'
  }
  if (from.x === to.x && from.y === to.y - 1) {
    return 'down'
  }
  if (from.x === to.x + 1 && from.y === to.y) {
    return 'left'
  }
  return null
}
