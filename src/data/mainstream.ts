/**
 * Curated list of mainstream channel IDs per country.
 * These are well-known national broadcast networks, major news channels,
 * and top sports channels for each country.
 *
 * For countries not in this list, fallback heuristic is used:
 * channel has logo + category in [general, news, sports, entertainment].
 */

const MAINSTREAM_IDS: Record<string, string[]> = {
  AR: [
    'Telefe.ar', 'ElTrece.ar', 'ElNueve.ar', 'AmericaTV.ar', 'TVPublica.ar',
    'NETTV.ar', 'Canal26.ar', 'TN.ar', 'C5N.ar', 'CronicaTV.ar', 'A24.ar',
    'LaNacionPlus.ar', 'IPNoticias.ar', 'CanaldelaCiudad.ar', 'TyCSports.ar',
    'DeporTV.ar', 'ESPNPremium.ar', 'TNTSports.ar', 'CanalShowsport.ar',
    'Encuentro.ar', 'Pakapaka.ar', 'CineAr.ar', 'CanalRural.ar', 'ElDoce.ar',
  ],
  US: [
    'ABC.us', 'CBS.us', 'NBC.us', 'Fox.us', 'TheCW.us', 'PBS.us',
    'CNN.us', 'FoxNewsChannel.us', 'MSNBCInternational.us', 'CNBC.us',
    'BloombergTV.us', 'NewsmaxTV.us', 'NewsNation.us', 'CSPAN.us',
    'ABCNewsLive.us', 'CBSNews247.us', 'ESPN.us', 'ESPN2.us',
    'FoxSports1.us', 'FoxSports2.us', 'NFLNetwork.us', 'MLBNetwork.us',
    'NBATV.us', 'Univision.us', 'Telemundo.us', 'AMC.us', 'TNT.us',
    'USANetwork.us', 'DiscoveryChannel.us',
  ],
  BR: [
    'RedeGlobo.br', 'SBTNacional.br', 'Record.br', 'Band.br', 'RedeTV.br',
    'TVCultura.br', 'TVBrasil.br', 'GloboNews.br', 'CNNBrasil.br',
    'RecordNews.br', 'BandNews.br', 'JovemPanNews.br', 'SporTV.br',
    'ESPN.br', 'BandSports.br', 'CanalBrasil.br', 'Multishow.br',
  ],
  MX: [
    'LasEstrellas.mx', 'Canal5.mx', 'ElNu9ve.mx', 'AztecaUno.mx',
    'Azteca7.mx', 'ADN40.mx', 'ImagenTV.mx', 'MultimediosMonterrey.mx',
    'Canal22MetropolitanayNacional.mx', 'Foro.mx', 'MilenioTelevision.mx',
    'ExcelsiorTV.mx', 'TUDN.mx', 'Bandamax.mx',
  ],
  ES: [
    'La1.es', 'La2.es', 'Antena3.es', 'Cuatro.es', 'Telecinco.es',
    'LaSexta.es', '24Horas.es', 'Clan.es', 'Neox.es', 'Nova.es',
    'Mega.es', 'Teledeporte.es', 'TV3.es', 'CanalSur.es', 'Telemadrid.es',
  ],
  CO: [
    'CaracolTV.co', 'CanalRCN.co', 'Canal1.co', 'CitytvBogota.co',
    'Teleantioquia.co', 'Telepacifico.co', 'SenalColombia.co',
    'CanalCapital.co', 'NoticiasCaracolEnVivo.co', 'NoticiasRCN.co',
    'Cablenoticias.co', 'WinSports.co',
  ],
  CL: [
    'TVN.cl', 'Canal13.cl', 'Mega.cl', 'ChileVision.cl', 'LaRed.cl',
    'TVPlus.cl', 'TVChile.cl', 'CNNChile.cl', '24Horas.cl',
    'MeganoticiasAhora.cl',
  ],
  PE: [
    'AmericaTelevision.pe', 'Latina.pe', 'PanamericanaTV.pe', 'ATV.pe',
    'TVPeru.pe', 'GlobalTV.pe', 'WillaxTV.pe', 'CanalN.pe', 'RPPTV.pe',
    'TVPeruNoticias.pe', 'GolPeru.pe',
  ],
  UY: [
    'Canal4.uy', 'Canal5.uy', 'Canal10.uy', 'Teledoce.uy', 'TVCiudad.uy',
    'VTV.uy',
  ],
  GB: [
    'BBCOne.uk', 'BBCTwo.uk', 'BBCThree.uk', 'BBCFour.uk', 'BBCNews.uk',
    'ITV1.uk', 'ITV2.uk', 'ITV3.uk', 'ITV4.uk', 'Channel4.uk',
    'Channel5.uk', 'SkyNews.uk', 'SkySportsMainEvent.uk',
    'SkySportsFootball.uk', 'SkySportsNews.uk', 'GBNews.uk', 'TalkTV.uk',
    'E4.uk', 'More4.uk', 'Film4.uk',
  ],
  FR: [
    'TF1.fr', 'France2.fr', 'France3.fr', 'France4.fr', 'France5.fr',
    'arte.fr', 'M6.fr', 'CanalPlus.fr', 'BFMTV.fr', 'CNews.fr',
    'LCI.fr', 'Franceinfo.fr', 'France24.fr', 'TMC.fr', 'LEquipe.fr',
    'Eurosport1.fr',
  ],
  DE: [
    'DasErste.de', 'ZDF.de', 'RTL.de', 'SAT1.de', 'ProSieben.de',
    'VOX.de', 'kabeleins.de', 'ntv.de', 'WELT.de', 'Sport1.de',
    'tagesschau24.de', 'ZDFneo.de', 'ZDFinfo.de', 'phoenix.de',
    '3sat.de', 'arte.de', 'DMAX.de',
  ],
  IT: [
    'Rai1.it', 'Rai2.it', 'Rai3.it', 'Rete4.it', 'Canale5.it',
    'Italia1.it', 'LA7.it', 'RaiNews24.it', 'SkyTG24PrimoPiano.it',
    'TGCom24.it', 'RaiSport.it', 'TV8.it', 'Nove.it', 'Cielo.it',
  ],
  PT: [
    'RTP1.pt', 'RTP2.pt', 'RTPNoticias.pt', 'SIC.pt', 'SICNoticias.pt',
    'TVI.pt', 'CMTV.pt', 'CNNPortugal.pt', 'SportTV1.pt', 'SportTV2.pt',
    'PortoCanal.pt', 'RTPInternacional.pt',
  ],
  VE: [
    'Venevision.ve', 'Televen.ve', 'Globovision.ve',
    'VenezolanadeTelevision.ve', 'TVes.ve', 'MeridianoTV.ve', 'Telesur.ve',
  ],
  EC: [
    'Ecuavisa.ec', 'Teleamazonas.ec', 'TCTelevision.ec', 'RTS.ec',
    'EcuadorTV.ec', 'Gamavision.ec', 'Telerama.ec',
  ],
  PY: [
    'SNT.py', 'Telefuturo.py', 'NPY.py', 'ABCTVParaguay.py',
    'Latele.py', 'Trece.py', 'Unicanal.py',
  ],
  BO: [
    'UnitelSantaCruz.bo', 'UnitelLaPaz.bo', 'UnitelCochabamba.bo',
    'RedUno.bo', 'ATBLaPaz.bo', 'ATBSantaCruz.bo', 'Bolivision.bo',
    'CadenaA.bo', 'BoliviaTV.bo',
  ],
  CR: [
    'Teletica7.cr', 'TreceCostaRicaTelevision.cr', 'Canal6.cr',
    'Canal11.cr', 'ExtraTV42.cr',
  ],
  PA: [
    'TVN.pa', 'RPCTV.pa', 'Telemetro.pa', 'NexTVCanal21.pa',
    'SerTV.pa', 'TVMax.pa', 'ECOTV.pa',
  ],
};

// Build a fast lookup Set
const MAINSTREAM_SET = new Set<string>();
for (const ids of Object.values(MAINSTREAM_IDS)) {
  for (const id of ids) {
    MAINSTREAM_SET.add(id);
  }
}

const FALLBACK_CATEGORIES = new Set([
  'general', 'news', 'sports', 'entertainment', 'movies',
]);

/**
 * Check if a channel is mainstream.
 * Uses curated list first, falls back to heuristic for uncurated countries.
 */
export function isMainstreamChannel(
  channelId: string,
  country: string | undefined,
  hasLogo: boolean,
  categories: string[],
): boolean {
  // If we have a curated list for this country, use it exclusively
  if (country && MAINSTREAM_IDS[country]) {
    return MAINSTREAM_SET.has(channelId);
  }
  // Fallback heuristic: has logo + recognized category
  if (!hasLogo) return false;
  return categories.some(cat => FALLBACK_CATEGORIES.has(cat.toLowerCase()));
}
