// Completa el listado 2026 con director / año de estreno / país.
// Mantiene TODOS los registros (incluidas revisiones / duplicados).
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
process.chdir(ROOT);

// numero, fecha(DD/MM), titulo, director, anio_estreno, pais, confianza(A/M/B), nota
const P = [
[1,"04/01","Bring Her Back","Danny Philippou, Michael Philippou",2025,"Australia","A",""],
[2,"05/01","Find Me Guilty","Sidney Lumet",2006,"USA","A",""],
[3,"06/01","The Cabin in the Woods","Drew Goddard",2012,"USA","A",""],
[4,"07/01","Incendies","Denis Villeneuve",2010,"Canadá","A","fecha original decía 07/10, asumo 07/01"],
[5,"08/01","The Life of Chuck","Mike Flanagan",2024,"USA","A",""],
[6,"10/01","Clown in a Cornfield","Eli Craig",2025,"USA","A",""],
[7,"16/01","Leap Year","Anand Tucker",2010,"USA / Irlanda","A",""],
[8,"18/01","The Ladykillers","Joel Coen, Ethan Coen",2004,"USA","A",""],
[9,"21/01","La virgen de la tosquera","Laura Casabé",2025,"Argentina","A",""],
[10,"24/01","Ballerina (From the World of John Wick)","Len Wiseman",2025,"USA","A",""],
[11,"24/01","Acto de violencia en una joven periodista","Manuel Lamas",1988,"Uruguay","A",""],
[12,"25/01","Sisu: Road to Revenge","Jalmari Helander",2025,"Finlandia","A","'Sisu 2'"],
[13,"25/01","Soft & Quiet","Beth de Araújo",2022,"USA","A",""],
[14,"26/01","Las barras bravas","Enrique Carreras",1985,"Argentina","A",""],
[15,"27/01","Los payasos","Lucas Bucci, Tomás Sposato",2019,"Argentina","A","comedia documental"],
[16,"27/01","El secreto de Marrowbone","Sergio G. Sánchez",2017,"España","A",""],
[17,"28/01","Possession","Andrzej Żuławski",1981,"Francia / Alemania Occidental","A",""],
[18,"29/01","Bugonia","Yorgos Lanthimos",2025,"USA / Reino Unido","A",""],
[19,"31/01","Tusk","Kevin Smith",2014,"USA","A",""],
[20,"02/02","El coso","Néstor Frenkel",2022,"Argentina","A","doc sobre Federico Peralta Ramos"],
[21,"03/02","To Wong Foo, Thanks for Everything! Julie Newmar","Beeban Kidron",1995,"USA","A",""],
[22,"04/02","Lamb","Valdimar Jóhannsson",2021,"Islandia","A",""],
[23,"05/02","Tiempo de pagar","Felipe Wein",2024,"Argentina","A","thriller"],
[24,"06/02","Crimewave","Sam Raimi",1985,"USA","A",""],
[25,"07/02","Black Sheep","Jonathan King",2006,"Nueva Zelanda","A",""],
[26,"08/02","Me, Myself & Irene","Bobby Farrelly, Peter Farrelly",2000,"USA","A","registrado como 'Irene, me and myself'"],
[27,"09/02","Becoming Led Zeppelin","Bernard MacMahon",2025,"Reino Unido / USA","A",""],
[28,"10/02","Raising Arizona","Joel Coen, Ethan Coen",1987,"USA","A",""],
[29,"12/02","The Amateur","James Hawes",2025,"USA / Reino Unido","A",""],
[30,"17/02","Boys Don't Cry","Kimberly Peirce",1999,"USA","A",""],
[31,"18/02","Un peso, un dólar","Gabriel Condron",2007,"Argentina","A",""],
[32,"19/02","Pieces (Mil gritos tiene la noche)","Juan Piquer Simón",1982,"España","A",""],
[33,"21/02","Evil Dead II","Sam Raimi",1987,"USA","A",""],
[34,"22/02","Ford v Ferrari","James Mangold",2019,"USA","A",""],
[35,"23/02","O Agente Secreto","Kleber Mendonça Filho",2025,"Brasil","A",""],
[36,"24/02","La vida útil","Federico Veiroj",2010,"Uruguay","A",""],
[37,"25/02","The Smashing Machine","Benny Safdie",2025,"USA","A",""],
[38,"26/02","Todo el año es Navidad","Néstor Frenkel",2018,"Argentina","A","documental"],
[39,"27/02","Gattaca","Andrew Niccol",1997,"USA","A",""],
[40,"28/02","Nighthawks","Bruce Malmuth",1981,"USA","A",""],
[41,"28/02","The Thing","John Carpenter",1982,"USA","A",""],
[42,"01/03","Sex Tape","Jake Kasdan",2014,"USA","A",""],
[43,"01/03","Office Space","Mike Judge",1999,"USA","A",""],
[44,"03/03","Kill Bill: The Whole Bloody Affair","Quentin Tarantino",2011,"USA","A",""],
[45,"05/03","The NeverEnding Story","Wolfgang Petersen",1984,"Alemania Occidental / USA","A",""],
[46,"06/03","Chicos ricos","Mariano Galperín",2000,"Argentina","A",""],
[47,"07/03","Good Fortune","Aziz Ansari",2025,"USA","A",""],
[48,"07/03","Battle of the Sexes","Jonathan Dayton, Valerie Faris",2017,"USA / Reino Unido","A",""],
[49,"07/03","Ghostbusters","Ivan Reitman",1984,"USA","A",""],
[50,"08/03","Redux Redux","Kevin McManus, Matthew McManus",2025,"USA","A",""],
[51,"10/03","Marty Supreme","Josh Safdie",2025,"USA","A",""],
[52,"12/03","El extraño viaje","Fernando Fernán Gómez",1964,"España","A",""],
[53,"13/03","Fargo","Joel Coen, Ethan Coen",1996,"USA","A",""],
[54,"14/03","The Greatest Showman","Michael Gracey",2017,"USA","A",""],
[55,"14/03","El tema del verano","Pablo Stoll",2024,"Uruguay / Argentina / Chile","A",""],
[56,"14/03","Bring Her Back","Danny Philippou, Michael Philippou",2025,"Australia","A","revisión de #1"],
[57,"15/03","Bacurau","Kleber Mendonça Filho, Juliano Dornelles",2019,"Brasil","A",""],
[58,"15/03","Talk to Me","Danny Philippou, Michael Philippou",2022,"Australia","A",""],
[59,"16/03","Late Night with the Devil","Cameron Cairnes, Colin Cairnes",2023,"Australia","A",""],
[60,"19/03","Don't Die: The Man Who Wants to Live Forever","Bryce Dallas Howard",2025,"USA","A",""],
[61,"20/03","Nuestra tierra","Lucrecia Martel",2025,"Argentina","A","documental"],
[62,"21/03","The Vanishing (Spoorloos)","George Sluizer",1988,"Países Bajos / Francia","A",""],
[63,"21/03","The Running Man","Edgar Wright",2025,"USA","A",""],
[64,"22/03","All the President's Men","Alan J. Pakula",1976,"USA","A",""],
[65,"22/03","Top Secret!","Jim Abrahams, David Zucker, Jerry Zucker",1984,"USA","A",""],
[66,"24/03","Scream 7","Kevin Williamson",2026,"USA","A",""],
[67,"24/03","The Running Man","Paul Michael Glaser",1987,"USA","A",""],
[68,"28/03","The Boondock Saints","Troy Duffy",1999,"USA","A",""],
[69,"29/03","F1","Joseph Kosinski",2025,"USA","A",""],
[70,"29/03","Burn After Reading","Joel Coen, Ethan Coen",2008,"USA","A",""],
[71,"29/03","Send Help","Sam Raimi",2026,"USA","A",""],
[72,"30/03","The Amazing Transplant","Doris Wishman",1970,"USA","A",""],
[73,"30/03","Promising Young Woman","Emerald Fennell",2020,"Reino Unido / USA","A",""],
[74,"02/04","Eating Raoul","Paul Bartel",1982,"USA","A",""],
[75,"09/04","La H","Nicanor Loreti",2011,"Argentina","A","documental sobre Hermética"],
[76,"10/04","Lord of War","Andrew Niccol",2005,"USA","A",""],
[77,"11/04","La Ciénaga","Lucrecia Martel",2001,"Argentina","A",""],
[78,"16/04","El otro hermano","Israel Adrián Caetano",2017,"Argentina","A",""],
[79,"17/04","Source Code","Duncan Jones",2011,"USA","A",""],
[80,"18/04","A Real Pain","Jesse Eisenberg",2024,"USA / Polonia","A",""],
[81,"19/04","31","Rob Zombie",2016,"USA","A",""],
[82,"19/04","Rough Night","Lucia Aniello",2017,"USA","A",""],
[83,"23/04","En retirada","Juan Carlos Desanzo",1984,"Argentina","A",""],
[84,"25/04","Ready or Not","Matt Bettinelli-Olpin, Tyler Gillett",2019,"USA / Canadá","A","'Ready or bot'"],
[85,"26/04","Thank You for Smoking","Jason Reitman",2005,"USA","A",""],
[86,"26/04","Carrie","Brian De Palma",1976,"USA","A",""],
[87,"30/04","Yiya Murano: muerte a la hora del té","Alejandro Hartmann",2026,"Argentina","A","documental Netflix"],
[88,"01/05","Medianeras","Gustavo Taretto",2011,"Argentina","A",""],
[89,"02/05","2073","Asif Kapadia",2024,"Reino Unido / USA","A",""],
[90,"02/05","Anaconda","Tom Gormican",2025,"USA","A","remake con Jack Black y Paul Rudd"],
[91,"03/05","Tenacious D in The Pick of Destiny","Liam Lynch",2006,"USA","A",""],
[92,"04/05","Últimos días de la víctima","Adolfo Aristarain",1982,"Argentina","A",""],
[93,"06/05","La parte del león","Adolfo Aristarain",1978,"Argentina","A",""],
[94,"09/05","Den of Thieves 2: Pantera","Christian Gudegast",2025,"USA","A",""],
[95,"09/05","Carrie","Kimberly Peirce",2013,"USA","A",""],
[96,"10/05","Lenny","Bob Fosse",1974,"USA","A",""],
[97,"13/05","Traslados","Nicolás Gil Lavedra",2024,"Argentina","A","documental"],
[98,"15/05","Fase 7","Nicolás Goldbart",2011,"Argentina","A",""],
[99,"16/05","The Taking of Pelham One Two Three","Joseph Sargent",1974,"USA","A",""],
[100,"16/05","Tin Soldier","Brad Furman",2025,"USA","A",""],
[101,"16/05","Magnolia","Paul Thomas Anderson",1999,"USA","A",""],
[102,"17/05","Death Becomes Her","Robert Zemeckis",1992,"USA","A",""],
[103,"17/05","The Curious Case of Benjamin Button","David Fincher",2008,"USA","A",""],
[104,"20/05","Moebius","Gustavo Mosquera R.",1996,"Argentina","A",""],
[105,"22/05","The Star Chamber","Peter Hyams",1983,"USA","A",""],
[106,"23/05","Goodfellas","Martin Scorsese",1990,"USA","A","fecha original decía 23/06, asumo 23/05"],
[107,"24/05","Christine","John Carpenter",1983,"USA","A",""],
[108,"25/05","The Taking of Pelham 123","Tony Scott",2009,"USA","A",""],
[109,"25/05","Hannibal","Ridley Scott",2001,"USA","A",""],
[110,"28/05","Time Lapse","Bradley King",2014,"USA","A",""],
[111,"29/05","Un lugar en el mundo","Adolfo Aristarain",1992,"Argentina / Uruguay / España","A",""],
[112,"30/05","Desearás al hombre de tu hermana","Diego Kaplan",2017,"Argentina","A",""],
[113,"31/05","No Way Out","Roger Donaldson",1987,"USA","A",""],
[114,"31/05","The Bride!","Maggie Gyllenhaal",2026,"USA","A","con Jessie Buckley y Christian Bale"],
[115,"01/06","¿Quién puede matar a un niño?","Narciso Ibáñez Serrador",1976,"España","A",""],
[116,"05/06","Twins","Ivan Reitman",1988,"USA","A",""],
[117,"06/06","DodgeBall: A True Underdog Story","Rawson Marshall Thurber",2004,"USA","A",""],
[118,"06/06","John Wick","Chad Stahelski",2014,"USA","A",""],
[119,"07/06","Inside Man","Spike Lee",2006,"USA","A",""],
[120,"07/06","Ladies First","Thea Sharrock",2026,"USA","A","comedia Netflix con Sacha Baron Cohen"],
[121,"07/06","The Royal Tenenbaums","Wes Anderson",2001,"USA","A",""],
[122,"10/06","Blood Simple","Joel Coen, Ethan Coen",1984,"USA","A",""],
[123,"11/06","El vampiro negro","Román Viñoly Barreto",1953,"Argentina","A",""],
[124,"11/06","John Wick: Chapter 2","Chad Stahelski",2017,"USA","A",""],
[125,"12/06","Mortal Kombat","Simon McQuoid",2021,"USA","A",""],
[126,"13/06","It Follows","David Robert Mitchell",2014,"USA","A",""],
[127,"13/06","Arrebato","Iván Zulueta",1979,"España","A",""],
[128,"13/06","John Wick: Chapter 3 – Parabellum","Chad Stahelski",2019,"USA","A",""],
[129,"14/06","They Will Kill You","Kirill Sokolov",2026,"USA","A",""],
[130,"14/06","Mortal Kombat II","Simon McQuoid",2026,"USA / Australia","A",""],
[131,"14/06","John Wick: Chapter 4","Chad Stahelski",2023,"USA","A",""],
[132,"14/06","The 40-Year-Old Virgin","Judd Apatow",2005,"USA","A","'40 year old Virginia'"],
[133,"15/06","Vampire humaniste cherche suicidaire consentant","Ariane Louis-Seize",2023,"Canadá","A",""],
[134,"18/06","50/50","Jonathan Levine",2011,"USA","A",""],
[135,"20/06","Ghost World","Terry Zwigoff",2001,"USA / Reino Unido / Alemania","A",""],
[136,"21/06","Foul Play","Colin Higgins",1978,"USA","A",""],
[137,"24/06","The Hunt","Craig Zobel",2020,"USA","A",""],
[138,"27/06","Mortal Kombat","Paul W. S. Anderson",1995,"USA","A",""],
[139,"27/06","Undercover Brother","Malcolm D. Lee",2002,"USA","A",""],
[140,"28/06","Soñar, soñar","Leonardo Favio",1976,"Argentina","A",""],
[141,"03/07","Weekend at Bernie's","Ted Kotcheff",1989,"USA","A",""],
[142,"04/07","Mortal Kombat: Annihilation","John R. Leonetti",1997,"USA","A",""],
[143,"05/07","Equilibrium","Kurt Wimmer",2002,"USA","A",""],
[144,"05/07","Shampoo","Hal Ashby",1975,"USA","A",""],
[145,"09/07","Mikey and Nicky","Elaine May",1976,"USA","A",""],
[146,"09/07","Bunny Lake Is Missing","Otto Preminger",1965,"Reino Unido","A",""],
[147,"09/07","Michael","Antoine Fuqua",2026,"USA","A","biopic de Michael Jackson"],
[148,"10/07","Ready or Not 2: Here I Come","Matt Bettinelli-Olpin, Tyler Gillett",2026,"USA","A",""],
[149,"11/07","Backrooms","Kane Parsons",2026,"USA","A","película A24"],
[150,"12/07","Antiviral","Brandon Cronenberg",2012,"Canadá","A",""],
[151,"14/07","El partido","Juan Cabral, Santiago Franco",2026,"Argentina","A","doc sobre Argentina-Inglaterra 1986"],
[152,"17/07","Let the Corpses Tan (Laissez bronzer les cadavres)","Hélène Cattet, Bruno Forzani",2017,"Bélgica / Francia","A",""],
[153,"18/07","Django Unchained","Quentin Tarantino",2012,"USA","A",""],
[154,"18/07","16 Blocks","Richard Donner",2006,"USA / Alemania","A",""],
[155,"19/07","The Departed","Martin Scorsese",2006,"USA","A",""],
[156,"21/07","A Nightmare on Elm Street","Wes Craven",1984,"USA","A",""],
[157,"22/07","But I'm a Cheerleader","Jamie Babbit",1999,"USA","A",""],
[158,"23/07","Sleepers","Barry Levinson",1996,"USA","A",""],
[159,"23/07","Misery","Rob Reiner",1990,"USA","A",""],
[160,"24/07","Internal Affairs","Mike Figgis",1990,"USA","A",""],
[161,"25/07","Razorback","Russell Mulcahy",1984,"Australia","A",""],
[162,"25/07","Eurovision Song Contest: The Story of Fire Saga","David Dobkin",2020,"USA","A",""],
[163,"26/07","Nineteen Eighty-Four","Michael Radford",1984,"Reino Unido","A",""],
[164,"26/07","The Sheep Detectives","Kyle Balda",2026,"USA","A","basada en 'Three Bags Full' de Leonie Swann; guion de Craig Mazin"],
[165,"26/07","Scary Movie 6","Michael Tiddes",2026,"USA","A","reboot de los Wayans"],
[166,"28/07","Los jóvenes viejos","Rodolfo Kuhn",1962,"Argentina","A",""],
[167,"28/07","A Nightmare on Elm Street 2: Freddy's Revenge","Jack Sholder",1985,"USA","A",""],
[168,"01/08","Obsession","Brian De Palma",1976,"USA","A",""],
[169,"05/08","Electra Glide in Blue","James William Guercio",1973,"USA","A",""],
[170,"06/08","A Nightmare on Elm Street 3: Dream Warriors","Chuck Russell",1987,"USA","A",""],
[171,"07/08","Edmond","Stuart Gordon",2005,"USA","A",""],
[172,"07/08","Deuce Bigalow: European Gigolo","Mike Bigelow",2005,"USA / Países Bajos","A",""],
[173,"08/08","La dicha en movimiento","Maxi Gutiérrez",2025,"Argentina","A",""],
[174,"08/08","A Nightmare on Elm Street 4: The Dream Master","Renny Harlin",1988,"USA","A",""],
[175,"09/08","A Nightmare on Elm Street 5: The Dream Child","Stephen Hopkins",1989,"USA","A",""],
[176,"13/08","Fatal Attraction","Adrian Lyne",1987,"USA","A",""],
[177,"14/08","Not Another Teen Movie","Joel Gallen",2001,"USA","A","registrado como 'Not another american movie'"],
[178,"14/08","Freddy's Dead: The Final Nightmare","Rachel Talalay",1991,"USA","A",""],
[179,"14/08","Thief","Michael Mann",1981,"USA","A",""],
[180,"15/08","The Warriors","Walter Hill",1979,"USA","A",""],
[181,"15/08","Wes Craven's New Nightmare","Wes Craven",1994,"USA","A",""],
[182,"15/08","The Hot Chick","Tom Brady",2002,"USA","A",""],
[183,"16/08","Rolling Thunder","John Flynn",1977,"USA","A",""],
[184,"16/08","Tiempo de valientes","Damián Szifrón",2005,"Argentina","A",""],
[185,"17/08","Freddy vs. Jason","Ronny Yu",2003,"USA / Canadá / Italia","A",""],
[186,"17/08","Boogie Nights","Paul Thomas Anderson",1997,"USA","A",""],
[187,"17/08","X","Ti West",2022,"USA","A",""],
[188,"19/08","A Nightmare on Elm Street","Samuel Bayer",2010,"USA","A","remake"],
[189,"20/08","Dawn of the Dead","Zack Snyder",2004,"USA / Canadá / Japón","A","asumo que te referías a #189"],
[190,"21/08","Would You Rather","David Guy Levy",2012,"USA","A",""],
[191,"21/08","Pearl","Ti West",2022,"USA / Canadá","A",""],
[192,"22/08","Experiment in Terror","Blake Edwards",1962,"USA","A",""],
[193,"22/08","Fritz the Cat","Ralph Bakshi",1972,"USA","A",""],
[194,"27/08","Eyes Without a Face (Les yeux sans visage)","Georges Franju",1960,"Francia / Italia","A",""],
[195,"28/08","Perdita Durango","Álex de la Iglesia",1997,"España / México / USA","A",""],
[196,"30/08","Barreda","Daniela Goggi",2026,"Argentina","A",""],
[197,"31/08","Vampyros Lesbos","Jesús Franco",1971,"Alemania Occidental / España","A",""],
[198,"01/09","MaXXXine","Ti West",2024,"USA","A",""],
[199,"03/09","Super Troopers","Jay Chandrasekhar",2001,"USA","A",""],
[200,"04/09","The Rocky Horror Picture Show","Jim Sharman",1975,"Reino Unido / USA","A",""],
[201,"05/09","A History of Violence","David Cronenberg",2005,"USA / Alemania","A","registrada como 'A violent story'"],
[202,"05/09","Magic","Richard Attenborough",1978,"USA","A",""],
[203,"06/09","Hausu (House)","Nobuhiko Ôbayashi",1977,"Japón","A",""],
];

// --- normalización para detectar revisiones ---
const norm = s => (s||"").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g,"")
  .replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();

// títulos vistos antes de 2026 (del histórico ya migrado)
function parseCSV(s){const rows=[];let f="",row=[],q=false;for(let i=0;i<s.length;i++){const c=s[i];
if(q){if(c==='"'){if(s[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
else{if(c==='"')q=true;else if(c===","){row.push(f);f="";}else if(c==="\n"){row.push(f);rows.push(row);row=[];f="";}else if(c==="\r"){}else f+=c;}}
if(f.length||row.length){row.push(f);rows.push(row);}return rows;}
const hist = parseCSV(fs.readFileSync("cerebro/peliculas_import.csv","utf8")).slice(1);
const previos = new Map(); // norm(titulo) -> primer anio_visto
for (const r of hist) {
  const y = +r[7], t = norm(r[2]);           // 7=anio_visto, 2=titulo
  if (y && y < 2026 && t && !previos.has(t)) previos.set(t, y);
}

// revisiones dentro del propio 2026 (misma peli = título + director + año)
const key2026 = r => `${norm(r[2])}|${norm(r[3])}|${r[4]||"?"}`;
const vistos2026 = new Map();
for (const r of P) vistos2026.set(key2026(r), (vistos2026.get(key2026(r))||0)+1);

const esc = v => { v = v==null ? "" : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v; };
const rows = [["numero","fecha_vista","titulo","director","anio_estreno","pais_origen","visto_antes","revision_2026","confianza","nota"]];
const cnt = new Map();
for (const [num,fec,tit,dir,anio,pais,conf,nota] of P) {
  const [d,mo] = fec.split("/");
  const fecha = `2026-${mo}-${d}`;
  const t = norm(tit);
  const antes = previos.has(t) ? `Sí (${previos.get(t)})` : "No";
  const k = `${t}|${norm(dir)}|${anio||"?"}`;
  cnt.set(k, (cnt.get(k)||0)+1);
  const rev = vistos2026.get(k) > 1 ? `Sí (${cnt.get(k)}/${vistos2026.get(k)})` : "No";
  rows.push([num,fecha,tit,dir,anio,pais,antes,rev,conf,nota].map(esc));
}
fs.writeFileSync("cerebro/pelis_2026.csv", rows.map(r=>r.join(",")).join("\r\n"), "utf8");

const faltan = P.filter(r => r[6]!=="A");
console.log(`Escritas ${P.length} filas -> cerebro/pelis_2026.csv`);
console.log(`Confianza alta: ${P.length-faltan.length} | a confirmar: ${faltan.length}`);
console.log(`Revisiones dentro de 2026: ${[...vistos2026].filter(([,v])=>v>1).map(([k,v])=>k+" x"+v).join(", ")}`);
console.log("\n--- A CONFIRMAR ---");
for (const r of faltan) console.log(`#${r[0]} ${r[2]}  ->  ${r[7]}`);
