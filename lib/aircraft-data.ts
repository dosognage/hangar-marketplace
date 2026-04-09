/**
 * Aircraft database for autocomplete on the hangar request form.
 *
 * Dimensions are manufacturer-published values (imperial).
 * wingspan_ft  — tip to tip
 * length_ft    — overall fuselage length
 * height_ft    — overall height (tail tip to ground)
 *
 * Sources: Jane's All the World's Aircraft, manufacturer spec sheets,
 * FAA Type Certificate Data Sheets.
 */

export interface AircraftSpec {
  name: string          // canonical display name
  aliases: string[]     // extra search terms (abbreviations, nicknames)
  wingspan_ft: number
  length_ft: number
  height_ft: number
  category: 'piston-single' | 'piston-twin' | 'turboprop' | 'light-jet' | 'midsize-jet' | 'large-jet' | 'warbird' | 'helicopter' | 'other'
}

export const AIRCRAFT: AircraftSpec[] = [
  // ── Piston Singles ─────────────────────────────────────────────────────────
  {
    name: 'Cessna 150',
    aliases: ['C150', '150'],
    wingspan_ft: 33.2, length_ft: 23.9, height_ft: 8.5,
    category: 'piston-single',
  },
  {
    name: 'Cessna 152',
    aliases: ['C152', '152'],
    wingspan_ft: 33.2, length_ft: 24.1, height_ft: 8.6,
    category: 'piston-single',
  },
  {
    name: 'Cessna 172 Skyhawk',
    aliases: ['C172', '172', 'Skyhawk'],
    wingspan_ft: 36.1, length_ft: 27.2, height_ft: 8.9,
    category: 'piston-single',
  },
  {
    name: 'Cessna 177 Cardinal',
    aliases: ['C177', '177', 'Cardinal'],
    wingspan_ft: 35.6, length_ft: 27.3, height_ft: 8.7,
    category: 'piston-single',
  },
  {
    name: 'Cessna 182 Skylane',
    aliases: ['C182', '182', 'Skylane'],
    wingspan_ft: 36.0, length_ft: 29.0, height_ft: 9.3,
    category: 'piston-single',
  },
  {
    name: 'Cessna 206 Stationair',
    aliases: ['C206', '206', 'Stationair', 'TU206'],
    wingspan_ft: 36.0, length_ft: 28.6, height_ft: 9.4,
    category: 'piston-single',
  },
  {
    name: 'Cessna 210 Centurion',
    aliases: ['C210', '210', 'Centurion'],
    wingspan_ft: 36.9, length_ft: 28.2, height_ft: 9.7,
    category: 'piston-single',
  },
  {
    name: 'Cessna TTx / T240',
    aliases: ['TTx', 'T240', 'Columbia 400', 'LC40'],
    wingspan_ft: 35.8, length_ft: 26.5, height_ft: 9.0,
    category: 'piston-single',
  },
  {
    name: 'Piper PA-28 Cherokee',
    aliases: ['PA-28', 'Cherokee', 'Piper Cherokee'],
    wingspan_ft: 35.5, length_ft: 23.9, height_ft: 7.3,
    category: 'piston-single',
  },
  {
    name: 'Piper PA-28R Arrow',
    aliases: ['PA-28R', 'Piper Arrow', 'Arrow'],
    wingspan_ft: 35.5, length_ft: 24.0, height_ft: 8.1,
    category: 'piston-single',
  },
  {
    name: 'Piper PA-28-181 Archer',
    aliases: ['Archer', 'PA-28-181'],
    wingspan_ft: 35.5, length_ft: 24.0, height_ft: 7.3,
    category: 'piston-single',
  },
  {
    name: 'Piper PA-32 Cherokee Six',
    aliases: ['PA-32', 'Cherokee Six', 'Six'],
    wingspan_ft: 36.2, length_ft: 27.7, height_ft: 8.2,
    category: 'piston-single',
  },
  {
    name: 'Piper PA-32R Saratoga',
    aliases: ['PA-32R', 'Saratoga'],
    wingspan_ft: 36.2, length_ft: 28.2, height_ft: 8.8,
    category: 'piston-single',
  },
  {
    name: 'Piper PA-46 Malibu',
    aliases: ['PA-46', 'Malibu', 'Piper Malibu'],
    wingspan_ft: 43.0, length_ft: 28.9, height_ft: 11.3,
    category: 'piston-single',
  },
  {
    name: 'Piper PA-46-350P Mirage',
    aliases: ['Mirage', 'PA-46-350', 'Piper Mirage'],
    wingspan_ft: 43.0, length_ft: 29.0, height_ft: 11.3,
    category: 'piston-single',
  },
  {
    name: 'Beechcraft Bonanza A36',
    aliases: ['A36', 'Bonanza', 'Beechcraft Bonanza', 'BE36'],
    wingspan_ft: 33.6, length_ft: 27.6, height_ft: 8.7,
    category: 'piston-single',
  },
  {
    name: 'Beechcraft Bonanza V35',
    aliases: ['V35', 'V-tail Bonanza', 'V-tail'],
    wingspan_ft: 33.5, length_ft: 26.5, height_ft: 6.7,
    category: 'piston-single',
  },
  {
    name: 'Mooney M20J / 201',
    aliases: ['M20J', 'M20', 'Mooney 201', 'Mooney'],
    wingspan_ft: 36.1, length_ft: 24.1, height_ft: 8.4,
    category: 'piston-single',
  },
  {
    name: 'Mooney M20TN Acclaim',
    aliases: ['M20TN', 'Acclaim', 'Mooney Acclaim'],
    wingspan_ft: 36.1, length_ft: 26.8, height_ft: 8.4,
    category: 'piston-single',
  },
  {
    name: 'Cirrus SR20',
    aliases: ['SR20'],
    wingspan_ft: 38.3, length_ft: 27.2, height_ft: 8.9,
    category: 'piston-single',
  },
  {
    name: 'Cirrus SR22',
    aliases: ['SR22'],
    wingspan_ft: 38.3, length_ft: 26.1, height_ft: 9.0,
    category: 'piston-single',
  },
  {
    name: 'Cirrus SR22T',
    aliases: ['SR22T'],
    wingspan_ft: 38.3, length_ft: 26.1, height_ft: 9.0,
    category: 'piston-single',
  },
  {
    name: 'Diamond DA20',
    aliases: ['DA20', 'DA-20'],
    wingspan_ft: 35.8, length_ft: 23.5, height_ft: 7.1,
    category: 'piston-single',
  },
  {
    name: 'Diamond DA40',
    aliases: ['DA40', 'DA-40', 'Diamond Star'],
    wingspan_ft: 39.4, length_ft: 26.5, height_ft: 6.6,
    category: 'piston-single',
  },
  {
    name: 'Grumman AA-5 Traveler / Tiger',
    aliases: ['AA-5', 'Grumman Tiger', 'AA5', 'Tiger'],
    wingspan_ft: 31.6, length_ft: 22.0, height_ft: 8.0,
    category: 'piston-single',
  },
  {
    name: 'Maule M-7',
    aliases: ['Maule', 'M7'],
    wingspan_ft: 30.0, length_ft: 23.8, height_ft: 6.5,
    category: 'piston-single',
  },
  {
    name: 'American Champion Citabria',
    aliases: ['Citabria', '7ECA', 'Champion'],
    wingspan_ft: 33.5, length_ft: 23.2, height_ft: 7.5,
    category: 'piston-single',
  },
  {
    name: 'Glasair III',
    aliases: ['Glasair', 'Glasair III'],
    wingspan_ft: 23.3, length_ft: 20.0, height_ft: 6.2,
    category: 'piston-single',
  },
  {
    name: 'Van\'s RV-7',
    aliases: ['RV-7', 'RV7', "Van's RV", 'Vans RV'],
    wingspan_ft: 25.0, length_ft: 20.4, height_ft: 6.3,
    category: 'piston-single',
  },
  {
    name: 'Van\'s RV-10',
    aliases: ['RV-10', 'RV10'],
    wingspan_ft: 29.0, length_ft: 24.3, height_ft: 7.8,
    category: 'piston-single',
  },

  // ── Piston Twins ──────────────────────────────────────────────────────────
  {
    name: 'Piper PA-34 Seneca',
    aliases: ['PA-34', 'Seneca'],
    wingspan_ft: 38.8, length_ft: 28.6, height_ft: 9.8,
    category: 'piston-twin',
  },
  {
    name: 'Piper PA-44 Seminole',
    aliases: ['PA-44', 'Seminole'],
    wingspan_ft: 38.7, length_ft: 27.8, height_ft: 8.6,
    category: 'piston-twin',
  },
  {
    name: 'Piper PA-23 Aztec',
    aliases: ['PA-23', 'Aztec'],
    wingspan_ft: 37.2, length_ft: 30.2, height_ft: 10.4,
    category: 'piston-twin',
  },
  {
    name: 'Cessna 310',
    aliases: ['C310', '310'],
    wingspan_ft: 36.9, length_ft: 29.6, height_ft: 10.3,
    category: 'piston-twin',
  },
  {
    name: 'Cessna 337 Skymaster',
    aliases: ['337', 'Skymaster'],
    wingspan_ft: 38.0, length_ft: 29.9, height_ft: 9.4,
    category: 'piston-twin',
  },
  {
    name: 'Cessna 414 Chancellor',
    aliases: ['414', 'Chancellor'],
    wingspan_ft: 44.1, length_ft: 36.4, height_ft: 11.5,
    category: 'piston-twin',
  },
  {
    name: 'Cessna 421 Golden Eagle',
    aliases: ['421', 'Golden Eagle'],
    wingspan_ft: 41.2, length_ft: 36.1, height_ft: 11.3,
    category: 'piston-twin',
  },
  {
    name: 'Beechcraft Baron 55',
    aliases: ['Baron 55', 'BE55', 'Baron'],
    wingspan_ft: 37.8, length_ft: 29.1, height_ft: 9.7,
    category: 'piston-twin',
  },
  {
    name: 'Beechcraft Baron 58',
    aliases: ['Baron 58', 'BE58'],
    wingspan_ft: 37.8, length_ft: 29.9, height_ft: 9.8,
    category: 'piston-twin',
  },
  {
    name: 'Diamond DA42 Twin Star',
    aliases: ['DA42', 'DA-42', 'Twin Star'],
    wingspan_ft: 44.0, length_ft: 28.8, height_ft: 8.0,
    category: 'piston-twin',
  },
  {
    name: 'Piper PA-31 Navajo',
    aliases: ['PA-31', 'Navajo'],
    wingspan_ft: 40.7, length_ft: 32.7, height_ft: 13.0,
    category: 'piston-twin',
  },

  // ── Turboprops ────────────────────────────────────────────────────────────
  {
    name: 'Pilatus PC-12',
    aliases: ['PC12', 'PC-12 NG', 'Pilatus'],
    wingspan_ft: 53.3, length_ft: 47.3, height_ft: 14.0,
    category: 'turboprop',
  },
  {
    name: 'Daher TBM 700',
    aliases: ['TBM700', 'TBM 700'],
    wingspan_ft: 40.7, length_ft: 34.9, height_ft: 12.9,
    category: 'turboprop',
  },
  {
    name: 'Daher TBM 850',
    aliases: ['TBM850', 'TBM 850'],
    wingspan_ft: 40.7, length_ft: 34.9, height_ft: 12.9,
    category: 'turboprop',
  },
  {
    name: 'Daher TBM 900 / 910 / 930 / 940 / 960',
    aliases: ['TBM900', 'TBM 900', 'TBM 940', 'TBM 960', 'TBM940', 'TBM960', 'TBM 910', 'TBM 930', 'Daher TBM'],
    wingspan_ft: 40.7, length_ft: 34.9, height_ft: 12.9,
    category: 'turboprop',
  },
  {
    name: 'Piper PA-46-500TP Meridian',
    aliases: ['PA-46-500TP', 'Meridian', 'Piper Meridian'],
    wingspan_ft: 43.0, length_ft: 29.0, height_ft: 11.3,
    category: 'turboprop',
  },
  {
    name: 'Piper M500',
    aliases: ['M500', 'PA-46-M500'],
    wingspan_ft: 43.0, length_ft: 29.0, height_ft: 11.3,
    category: 'turboprop',
  },
  {
    name: 'Piper M600',
    aliases: ['M600', 'PA-46-M600'],
    wingspan_ft: 43.2, length_ft: 30.1, height_ft: 11.3,
    category: 'turboprop',
  },
  {
    name: 'Beechcraft King Air C90',
    aliases: ['King Air C90', 'C90', 'BE90'],
    wingspan_ft: 50.3, length_ft: 35.6, height_ft: 14.3,
    category: 'turboprop',
  },
  {
    name: 'Beechcraft King Air 200',
    aliases: ['King Air 200', 'B200', 'BE200', 'Super King Air'],
    wingspan_ft: 54.6, length_ft: 43.9, height_ft: 15.0,
    category: 'turboprop',
  },
  {
    name: 'Beechcraft King Air 350',
    aliases: ['King Air 350', 'B350', 'BE350'],
    wingspan_ft: 57.8, length_ft: 46.8, height_ft: 14.4,
    category: 'turboprop',
  },
  {
    name: 'Cessna 208 Caravan',
    aliases: ['208', 'Caravan', 'C208'],
    wingspan_ft: 52.1, length_ft: 37.7, height_ft: 14.2,
    category: 'turboprop',
  },
  {
    name: 'Cessna 208B Grand Caravan',
    aliases: ['208B', 'Grand Caravan'],
    wingspan_ft: 52.1, length_ft: 41.7, height_ft: 14.7,
    category: 'turboprop',
  },
  {
    name: 'Cessna 208B EX Grand Caravan EX',
    aliases: ['Grand Caravan EX', '208B EX'],
    wingspan_ft: 52.1, length_ft: 41.7, height_ft: 14.7,
    category: 'turboprop',
  },
  {
    name: 'Piper PA-31T Cheyenne',
    aliases: ['PA-31T', 'Cheyenne'],
    wingspan_ft: 42.7, length_ft: 34.7, height_ft: 12.7,
    category: 'turboprop',
  },

  // ── Light Jets ─────────────────────────────────────────────────────────────
  {
    name: 'Cirrus Vision Jet SF50',
    aliases: ['SF50', 'Vision Jet', 'Cirrus Jet'],
    wingspan_ft: 38.7, length_ft: 30.7, height_ft: 10.9,
    category: 'light-jet',
  },
  {
    name: 'HondaJet HA-420',
    aliases: ['HondaJet', 'HA-420', 'Honda Jet'],
    wingspan_ft: 39.9, length_ft: 42.6, height_ft: 14.9,
    category: 'light-jet',
  },
  {
    name: 'Embraer Phenom 100',
    aliases: ['Phenom 100', 'EMB-500'],
    wingspan_ft: 40.4, length_ft: 42.2, height_ft: 14.2,
    category: 'light-jet',
  },
  {
    name: 'Cessna Citation Mustang',
    aliases: ['Citation Mustang', '510', 'Mustang'],
    wingspan_ft: 43.2, length_ft: 40.7, height_ft: 13.5,
    category: 'light-jet',
  },
  {
    name: 'Cessna Citation CJ1+',
    aliases: ['CJ1', 'Citation CJ1', '525'],
    wingspan_ft: 47.2, length_ft: 42.7, height_ft: 13.8,
    category: 'light-jet',
  },
  {
    name: 'Cessna Citation CJ2+',
    aliases: ['CJ2', 'Citation CJ2', '525A'],
    wingspan_ft: 49.0, length_ft: 47.9, height_ft: 15.0,
    category: 'light-jet',
  },
  {
    name: 'Cessna Citation CJ3+',
    aliases: ['CJ3', 'Citation CJ3', '525B'],
    wingspan_ft: 49.8, length_ft: 51.2, height_ft: 15.5,
    category: 'light-jet',
  },
  {
    name: 'Cessna Citation CJ4',
    aliases: ['CJ4', 'Citation CJ4', '525C'],
    wingspan_ft: 50.8, length_ft: 53.3, height_ft: 15.5,
    category: 'light-jet',
  },
  {
    name: 'Bombardier Learjet 31',
    aliases: ['Learjet 31', 'LJ31', 'Lear 31'],
    wingspan_ft: 43.9, length_ft: 48.8, height_ft: 12.3,
    category: 'light-jet',
  },
  {
    name: 'Bombardier Learjet 35',
    aliases: ['Learjet 35', 'LJ35', 'Lear 35'],
    wingspan_ft: 39.7, length_ft: 48.8, height_ft: 12.3,
    category: 'light-jet',
  },
  {
    name: 'Pilatus PC-24',
    aliases: ['PC-24', 'PC24'],
    wingspan_ft: 55.7, length_ft: 55.4, height_ft: 17.4,
    category: 'light-jet',
  },

  // ── Midsize Jets ───────────────────────────────────────────────────────────
  {
    name: 'Embraer Phenom 300',
    aliases: ['Phenom 300', 'EMB-505'],
    wingspan_ft: 52.2, length_ft: 51.1, height_ft: 17.0,
    category: 'midsize-jet',
  },
  {
    name: 'Cessna Citation XLS+',
    aliases: ['Citation XLS', 'XLS', '560XL'],
    wingspan_ft: 56.4, length_ft: 52.6, height_ft: 15.6,
    category: 'midsize-jet',
  },
  {
    name: 'Cessna Citation Sovereign+',
    aliases: ['Sovereign', 'Citation Sovereign', '680'],
    wingspan_ft: 72.3, length_ft: 63.6, height_ft: 19.9,
    category: 'midsize-jet',
  },
  {
    name: 'Hawker 800XP',
    aliases: ['Hawker 800', 'HS125-800', 'BAe 125'],
    wingspan_ft: 51.4, length_ft: 51.2, height_ft: 17.8,
    category: 'midsize-jet',
  },
  {
    name: 'Hawker 900XP',
    aliases: ['Hawker 900', 'HS-900'],
    wingspan_ft: 54.4, length_ft: 51.4, height_ft: 18.1,
    category: 'midsize-jet',
  },
  {
    name: 'Beechcraft / Hawker 400XP',
    aliases: ['Hawker 400', 'Beechjet 400', 'T-1 Jayhawk', '400XP'],
    wingspan_ft: 46.5, length_ft: 48.5, height_ft: 13.9,
    category: 'midsize-jet',
  },
  {
    name: 'Bombardier Learjet 45',
    aliases: ['Learjet 45', 'LJ45', 'Lear 45'],
    wingspan_ft: 47.8, length_ft: 57.7, height_ft: 14.2,
    category: 'midsize-jet',
  },
  {
    name: 'Bombardier Learjet 60',
    aliases: ['Learjet 60', 'LJ60', 'Lear 60'],
    wingspan_ft: 43.9, length_ft: 58.7, height_ft: 14.8,
    category: 'midsize-jet',
  },
  {
    name: 'Bombardier Learjet 75',
    aliases: ['Learjet 75', 'LJ75', 'Lear 75'],
    wingspan_ft: 47.8, length_ft: 58.0, height_ft: 14.2,
    category: 'midsize-jet',
  },
  {
    name: 'Bombardier Challenger 300',
    aliases: ['Challenger 300', 'BD-100'],
    wingspan_ft: 63.5, length_ft: 68.8, height_ft: 20.9,
    category: 'midsize-jet',
  },
  {
    name: 'Bombardier Challenger 350',
    aliases: ['Challenger 350'],
    wingspan_ft: 63.5, length_ft: 68.8, height_ft: 20.9,
    category: 'midsize-jet',
  },
  {
    name: 'Dassault Falcon 2000',
    aliases: ['Falcon 2000', 'F2000'],
    wingspan_ft: 63.4, length_ft: 66.4, height_ft: 23.5,
    category: 'midsize-jet',
  },
  {
    name: 'Dassault Falcon 50',
    aliases: ['Falcon 50', 'F50'],
    wingspan_ft: 61.9, length_ft: 60.9, height_ft: 22.9,
    category: 'midsize-jet',
  },

  // ── Large / Long-Range Jets ────────────────────────────────────────────────
  {
    name: 'Bombardier Global 5000',
    aliases: ['Global 5000', 'BD-700-1A11'],
    wingspan_ft: 94.0, length_ft: 96.8, height_ft: 24.4,
    category: 'large-jet',
  },
  {
    name: 'Bombardier Global 6000',
    aliases: ['Global 6000', 'BD-700'],
    wingspan_ft: 94.0, length_ft: 99.4, height_ft: 24.9,
    category: 'large-jet',
  },
  {
    name: 'Bombardier Global 7500',
    aliases: ['Global 7500', 'BD-700-2A12'],
    wingspan_ft: 104.0, length_ft: 111.2, height_ft: 27.6,
    category: 'large-jet',
  },
  {
    name: 'Gulfstream G550',
    aliases: ['G550', 'GV', 'Gulfstream V'],
    wingspan_ft: 93.5, length_ft: 96.5, height_ft: 25.3,
    category: 'large-jet',
  },
  {
    name: 'Gulfstream G500',
    aliases: ['G500'],
    wingspan_ft: 93.5, length_ft: 91.0, height_ft: 25.5,
    category: 'large-jet',
  },
  {
    name: 'Gulfstream G600',
    aliases: ['G600'],
    wingspan_ft: 93.5, length_ft: 96.4, height_ft: 25.3,
    category: 'large-jet',
  },
  {
    name: 'Gulfstream G650',
    aliases: ['G650', 'GVII'],
    wingspan_ft: 99.7, length_ft: 99.8, height_ft: 25.7,
    category: 'large-jet',
  },
  {
    name: 'Gulfstream G700',
    aliases: ['G700'],
    wingspan_ft: 103.0, length_ft: 109.4, height_ft: 25.5,
    category: 'large-jet',
  },
  {
    name: 'Dassault Falcon 7X',
    aliases: ['Falcon 7X', 'F7X'],
    wingspan_ft: 86.3, length_ft: 76.4, height_ft: 25.0,
    category: 'large-jet',
  },
  {
    name: 'Dassault Falcon 8X',
    aliases: ['Falcon 8X', 'F8X'],
    wingspan_ft: 86.3, length_ft: 80.3, height_ft: 25.0,
    category: 'large-jet',
  },
  {
    name: 'Cessna Citation X+',
    aliases: ['Citation X', '750', 'CitationJet X'],
    wingspan_ft: 69.4, length_ft: 72.4, height_ft: 20.4,
    category: 'large-jet',
  },
  {
    name: 'Embraer Legacy 600',
    aliases: ['Legacy 600', 'ERJ-135 BJ'],
    wingspan_ft: 69.4, length_ft: 98.9, height_ft: 25.4,
    category: 'large-jet',
  },

  // ── Warbirds / Classic ─────────────────────────────────────────────────────
  {
    name: 'North American P-51 Mustang',
    aliases: ['P-51', 'Mustang', 'P51'],
    wingspan_ft: 37.0, length_ft: 32.3, height_ft: 13.8,
    category: 'warbird',
  },
  {
    name: 'North American T-6 Texan',
    aliases: ['T-6', 'Texan', 'Harvard', 'SNJ', 'T6'],
    wingspan_ft: 42.0, length_ft: 29.0, height_ft: 11.8,
    category: 'warbird',
  },
  {
    name: 'Stearman PT-17 Kaydet',
    aliases: ['PT-17', 'Stearman', 'Kaydet'],
    wingspan_ft: 32.1, length_ft: 24.9, height_ft: 9.2,
    category: 'warbird',
  },
  {
    name: 'Vought F4U Corsair',
    aliases: ['F4U', 'Corsair'],
    wingspan_ft: 41.0, length_ft: 33.4, height_ft: 16.1,
    category: 'warbird',
  },
  {
    name: 'Supermarine Spitfire',
    aliases: ['Spitfire'],
    wingspan_ft: 36.8, length_ft: 29.11, height_ft: 11.5,
    category: 'warbird',
  },
  {
    name: 'Douglas DC-3',
    aliases: ['DC-3', 'C-47', 'Dakota'],
    wingspan_ft: 95.0, length_ft: 64.5, height_ft: 16.9,
    category: 'warbird',
  },

  // ── Helicopters ────────────────────────────────────────────────────────────
  {
    name: 'Robinson R22',
    aliases: ['R22', 'Robinson R22'],
    wingspan_ft: 25.2, length_ft: 28.8, height_ft: 8.9,
    category: 'helicopter',
  },
  {
    name: 'Robinson R44',
    aliases: ['R44', 'Robinson R44'],
    wingspan_ft: 33.0, length_ft: 38.2, height_ft: 9.3,
    category: 'helicopter',
  },
  {
    name: 'Robinson R66',
    aliases: ['R66'],
    wingspan_ft: 33.4, length_ft: 40.2, height_ft: 11.4,
    category: 'helicopter',
  },
  {
    name: 'Bell 206 JetRanger',
    aliases: ['Bell 206', 'JetRanger', 'B206'],
    wingspan_ft: 33.4, length_ft: 38.9, height_ft: 9.5,
    category: 'helicopter',
  },
  {
    name: 'Bell 407',
    aliases: ['Bell 407', 'B407'],
    wingspan_ft: 35.0, length_ft: 41.9, height_ft: 11.9,
    category: 'helicopter',
  },
  {
    name: 'Airbus H125 (AS350)',
    aliases: ['H125', 'AS350', 'A-Star', 'Ecureuil'],
    wingspan_ft: 35.1, length_ft: 42.5, height_ft: 10.3,
    category: 'helicopter',
  },
  {
    name: 'Sikorsky S-76',
    aliases: ['S-76', 'S76'],
    wingspan_ft: 44.0, length_ft: 52.5, height_ft: 14.5,
    category: 'helicopter',
  },
]

/**
 * Search aircraft by query string — matches against name and aliases.
 * Returns up to `limit` results sorted by relevance (name-starts-with first).
 */
export function searchAircraft(query: string, limit = 8): AircraftSpec[] {
  if (!query || query.trim().length < 2) return []
  const q = query.toLowerCase().trim()
  const results: Array<{ spec: AircraftSpec; score: number }> = []

  for (const spec of AIRCRAFT) {
    const nameLower = spec.name.toLowerCase()
    // Score: name starts with query = 3, name contains query = 2, alias matches = 1
    if (nameLower.startsWith(q)) {
      results.push({ spec, score: 3 })
    } else if (nameLower.includes(q)) {
      results.push({ spec, score: 2 })
    } else if (spec.aliases.some(a => a.toLowerCase().includes(q))) {
      results.push({ spec, score: 1 })
    }
  }

  return results
    .sort((a, b) => b.score - a.score || a.spec.name.localeCompare(b.spec.name))
    .slice(0, limit)
    .map(r => r.spec)
}
