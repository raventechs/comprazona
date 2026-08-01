/*
  ARCHIVO: core.js
  VERSIÓN: v0.1
  FECHA: 01/08/2026
  PROYECTO: RavenMarket — Motor de Marketplaces Locales | RavenTechs
  CHANGELOG:
  - v0.1 (01/08/2026): Núcleo inicial del motor. Config, modo demo con tenant Garrafas+Agua,
    carga de tenant con branding runtime, normalización, búsqueda por sinónimos, ranking
    configurable con insignias, distancia haversine, horarios, formato pesos AR completo,
    generador de mensaje WhatsApp. Script clásico (sin módulos) para funcionar con file://.
*/

/* ================= CONFIGURACIÓN ================= */
var RM_CONFIG = {
  DEMO: true,                       // true = datos demo locales, sin Firebase
  TENANT_DEFAULT: 'garrafas-agua',
  SUPER_ADMIN: 'rgaraventa@gmail.com',
  FIREBASE: {
    // Pegar aquí la config del proyecto Firebase "ravenmarket" cuando exista:
    apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
  }
};

/* ================= DATOS DEMO (tenant 1) =================
   Editables libremente. En producción, todo esto vive en Firestore
   bajo tenants/{tenantId} y se administra desde admin.html.       */
var RM_DEMO = {
  tenant: {
    slug: 'garrafas-agua',
    nombre: 'Garrafas & Agua Catán',
    lema: 'Pedí y te lo llevan',
    colores: { primario: '#F27B13', secundario: '#2E9FC4', fondo: '#FAF8F5' },
    moneda: 'ARS',
    modulosActivos: ['garrafas', 'agua'],
    scoring: { precio: 35, distancia: 25, rating: 25, rapidez: 15, boostDestacada: 6 },
    zona: 'González Catán y alrededores'
  },
  categorias: [
    { id: 'garrafas', nombre: 'Garrafas', icono: '🔥', orden: 1, activa: true,
      sinonimos: ['garrafa', 'gas', 'tubo', 'glp', 'butano', '10kg', '15kg', '45kg', 'carga', 'recarga', 'estufa', 'cocina'] },
    { id: 'agua', nombre: 'Agua', icono: '💧', orden: 2, activa: true,
      sinonimos: ['bidon', 'bidón', 'agua', 'dispenser', 'soda', '20 litros', '20l', '12l', 'mineral'] }
  ],
  empresas: [
    { id: 'eltano', nombre: 'Garrafas El Tano', categorias: ['garrafas'],
      whatsapp: '5491100000001', direccion: 'Av. Simón Pérez 4500, G. Catán',
      geo: { lat: -34.769, lng: -58.628 }, tiempoEstimadoMin: 40,
      ratingProm: 4.6, ratingCant: 128, destacada: false, activa: true,
      horario: { desde: '08:00', hasta: '19:00', dias: [1,2,3,4,5,6], h24: false } },
    { id: 'sanjorge', nombre: 'Distribuidora San Jorge', categorias: ['garrafas','agua'],
      whatsapp: '5491100000002', direccion: 'Ruta 21 km 29, G. Catán',
      geo: { lat: -34.776, lng: -58.641 }, tiempoEstimadoMin: 60,
      ratingProm: 4.8, ratingCant: 342, destacada: true, activa: true,
      horario: { desde: '07:30', hasta: '20:00', dias: [1,2,3,4,5,6], h24: false } },
    { id: 'aguapura', nombre: 'Agua Pura Litoral', categorias: ['agua'],
      whatsapp: '5491100000003', direccion: 'Equipo del sur 2200, Virrey del Pino',
      geo: { lat: -34.802, lng: -58.662 }, tiempoEstimadoMin: 90,
      ratingProm: 4.4, ratingCant: 89, destacada: false, activa: true,
      horario: { desde: '08:00', hasta: '17:00', dias: [1,2,3,4,5], h24: false } },
    { id: 'gasexpress', nombre: 'Gas Express 24hs', categorias: ['garrafas'],
      whatsapp: '5491100000004', direccion: 'Av. Juan M. de Rosas 12400, G. Catán',
      geo: { lat: -34.757, lng: -58.615 }, tiempoEstimadoMin: 25,
      ratingProm: 4.2, ratingCant: 57, destacada: false, activa: true,
      horario: { desde: '00:00', hasta: '23:59', dias: [0,1,2,3,4,5,6], h24: true } }
  ],
  productos: {
    eltano: [
      { id: 'g10', nombre: 'Garrafa 10 kg (canje)', precio: 22500, categoria: 'garrafas', activo: true },
      { id: 'g15', nombre: 'Garrafa 15 kg (canje)', precio: 33500, categoria: 'garrafas', activo: true },
      { id: 'g45', nombre: 'Tubo 45 kg (canje)', precio: 97000, categoria: 'garrafas', activo: true }
    ],
    sanjorge: [
      { id: 'g10', nombre: 'Garrafa 10 kg (canje)', precio: 23000, categoria: 'garrafas', activo: true },
      { id: 'g15', nombre: 'Garrafa 15 kg (canje)', precio: 34000, categoria: 'garrafas', activo: true },
      { id: 'b20', nombre: 'Bidón de agua 20 L (retornable)', precio: 5500, categoria: 'agua', activo: true },
      { id: 'b12', nombre: 'Bidón de agua 12 L', precio: 4200, categoria: 'agua', activo: true }
    ],
    aguapura: [
      { id: 'b20', nombre: 'Bidón de agua 20 L (retornable)', precio: 5200, categoria: 'agua', activo: true },
      { id: 'b12', nombre: 'Bidón de agua 12 L', precio: 4000, categoria: 'agua', activo: true },
      { id: 'disp', nombre: 'Dispenser frío/calor (alquiler mensual)', precio: 9000, categoria: 'agua', activo: true }
    ],
    gasexpress: [
      { id: 'g10', nombre: 'Garrafa 10 kg (canje)', precio: 24500, categoria: 'garrafas', activo: true },
      { id: 'g15', nombre: 'Garrafa 15 kg (canje)', precio: 35500, categoria: 'garrafas', activo: true }
    ]
  }
};

/* ================= NÚCLEO DEL MOTOR ================= */
var RM = (function () {

  /* ---- Utilidades ---- */
  function normalizar(txt) {
    return String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function formatPesos(n) {
    // Formato argentino completo, sin sufijos: $23.000
    var v = Math.round(Number(n) || 0);
    return '$' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function distanciaKm(a, b) {
    if (!a || !b) return null;
    var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  function estaAbierta(emp, fecha) {
    var h = emp.horario;
    if (!h) return true;
    if (h.h24) return true;
    var d = fecha || new Date();
    if (h.dias.indexOf(d.getDay()) === -1) return false;
    var ahora = d.getHours() * 60 + d.getMinutes();
    var pDesde = h.desde.split(':'), pHasta = h.hasta.split(':');
    var desde = (+pDesde[0]) * 60 + (+pDesde[1]);
    var hasta = (+pHasta[0]) * 60 + (+pHasta[1]);
    return ahora >= desde && ahora <= hasta;
  }

  /* ---- Carga de tenant y branding runtime ---- */
  function initTenant(cb) {
    if (RM_CONFIG.DEMO) {
      aplicarBranding(RM_DEMO.tenant);
      cb(null, {
        tenant: RM_DEMO.tenant,
        categorias: RM_DEMO.categorias.filter(function (c) { return c.activa; })
                     .sort(function (a, b) { return a.orden - b.orden; }),
        empresas: RM_DEMO.empresas.filter(function (e) { return e.activa; }),
        productos: RM_DEMO.productos
      });
      return;
    }
    // Producción: leer tenants/{slug} desde Firestore (se implementa al conectar Firebase)
    cb('Firebase no configurado todavía. Activá DEMO o pegá la config en RM_CONFIG.FIREBASE.');
  }

  function aplicarBranding(tenant) {
    var r = document.documentElement.style;
    if (tenant.colores) {
      if (tenant.colores.primario) r.setProperty('--c-primario', tenant.colores.primario);
      if (tenant.colores.secundario) r.setProperty('--c-secundario', tenant.colores.secundario);
      if (tenant.colores.fondo) r.setProperty('--c-fondo', tenant.colores.fondo);
    }
    document.title = tenant.nombre;
  }

  /* ---- Búsqueda por sinónimos ---- */
  function buscarCategoria(query, categorias) {
    var q = normalizar(query);
    if (!q) return null;
    var palabras = q.split(/\s+/);
    var mejor = null, mejorPuntos = 0;
    categorias.forEach(function (cat) {
      var puntos = 0;
      var claves = [normalizar(cat.nombre)].concat((cat.sinonimos || []).map(normalizar));
      claves.forEach(function (clave) {
        if (!clave) return;
        if (q.indexOf(clave) !== -1) puntos += 3;
        palabras.forEach(function (p) {
          if (p.length >= 3 && (clave.indexOf(p) === 0 || p.indexOf(clave) === 0)) puntos += 1;
        });
      });
      if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = cat; }
    });
    return mejor;
  }

  /* ---- Ranking configurable + insignias ---- */
  function precioReferencia(empresaId, categoriaId, productos) {
    var lista = (productos[empresaId] || []).filter(function (p) {
      return p.activo && p.categoria === categoriaId;
    });
    if (!lista.length) return null;
    return Math.min.apply(null, lista.map(function (p) { return p.precio; }));
  }

  function rankear(empresas, categoriaId, productos, scoring, userGeo) {
    var candidatas = empresas.filter(function (e) {
      return e.categorias.indexOf(categoriaId) !== -1;
    }).map(function (e) {
      return {
        emp: e,
        precioRef: precioReferencia(e.id, categoriaId, productos),
        dist: userGeo ? distanciaKm(userGeo, e.geo) : null,
        abierta: estaAbierta(e)
      };
    });
    if (!candidatas.length) return [];

    function normalizarFactor(vals, valor, invertir) {
      var nums = vals.filter(function (v) { return v !== null && v !== undefined; });
      if (valor === null || valor === undefined || !nums.length) return 50;
      var min = Math.min.apply(null, nums), max = Math.max.apply(null, nums);
      if (max === min) return 100;
      var n = (valor - min) / (max - min) * 100;
      return invertir ? 100 - n : n;
    }

    var precios = candidatas.map(function (c) { return c.precioRef; });
    var dists = candidatas.map(function (c) { return c.dist; });
    var ratings = candidatas.map(function (c) { return c.emp.ratingProm; });
    var tiempos = candidatas.map(function (c) { return c.emp.tiempoEstimadoMin; });
    var pesoTotal = scoring.precio + scoring.distancia + scoring.rating + scoring.rapidez;

    candidatas.forEach(function (c) {
      var fPrecio = normalizarFactor(precios, c.precioRef, true);
      var fDist = normalizarFactor(dists, c.dist, true);
      var fRating = normalizarFactor(ratings, c.emp.ratingProm, false);
      var fRapidez = normalizarFactor(tiempos, c.emp.tiempoEstimadoMin, true);
      c.puntaje = (scoring.precio * fPrecio + scoring.distancia * fDist +
                   scoring.rating * fRating + scoring.rapidez * fRapidez) / pesoTotal;
      if (c.emp.destacada) c.puntaje += (scoring.boostDestacada || 0);
      if (!c.abierta) c.puntaje -= 25; // penalización cerrada (configurable a futuro)
      c.badges = [];
    });

    // Insignias
    candidatas.reduce(function (a, b) { return b.puntaje > a.puntaje ? b : a; })
      .badges.push({ icono: '⭐', texto: 'Recomendado' });
    var conPrecio = candidatas.filter(function (c) { return c.precioRef !== null; });
    if (conPrecio.length) {
      conPrecio.reduce(function (a, b) { return b.precioRef < a.precioRef ? b : a; })
        .badges.push({ icono: '💲', texto: 'Más económico' });
    }
    candidatas.reduce(function (a, b) { return b.emp.tiempoEstimadoMin < a.emp.tiempoEstimadoMin ? b : a; })
      .badges.push({ icono: '⚡', texto: 'Más rápido' });
    var conRating = candidatas.filter(function (c) { return c.emp.ratingCant >= 20; });
    if (conRating.length) {
      conRating.reduce(function (a, b) { return b.emp.ratingProm > a.emp.ratingProm ? b : a; })
        .badges.push({ icono: '🏆', texto: 'Mejor calificado' });
    }

    candidatas.sort(function (a, b) { return b.puntaje - a.puntaje; });
    return candidatas;
  }

  /* ---- Pedido → mensaje WhatsApp ---- */
  function codigoPedido() {
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', c = '';
    for (var i = 0; i < 4; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
    return c;
  }

  function mensajeWhatsApp(pedido, tenant) {
    var lineas = [];
    lineas.push('🛒 *NUEVO PEDIDO* — ' + tenant.nombre);
    lineas.push('Pedido #' + pedido.codigo);
    lineas.push('');
    pedido.items.forEach(function (it) {
      lineas.push('▪ ' + it.cant + ' x ' + it.nombre + ' — ' + formatPesos(it.precio * it.cant));
    });
    lineas.push('');
    lineas.push('💰 *Total: ' + formatPesos(pedido.total) + '*');
    lineas.push('📍 ' + pedido.direccion);
    if (pedido.nota) lineas.push('📝 ' + pedido.nota);
    lineas.push('🕐 ' + pedido.fechaTexto);
    return lineas.join('\n');
  }

  function waLink(telefono, texto) {
    return 'https://wa.me/' + String(telefono).replace(/\D/g, '') + '?text=' + encodeURIComponent(texto);
  }

  /* ---- API pública del núcleo ---- */
  return {
    normalizar: normalizar,
    formatPesos: formatPesos,
    distanciaKm: distanciaKm,
    estaAbierta: estaAbierta,
    initTenant: initTenant,
    buscarCategoria: buscarCategoria,
    rankear: rankear,
    codigoPedido: codigoPedido,
    mensajeWhatsApp: mensajeWhatsApp,
    waLink: waLink
  };
})();
