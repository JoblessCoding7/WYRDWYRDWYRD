import {getKt2Offer} from '~/lib/catalog.server';

/** Live KT2 price/stock/photos as JSON (for other front ends, e.g. a mini program). */
export async function loader() {
  return Response.json(await getKt2Offer(), {
    headers: {'Cache-Control': 'public, max-age=0, s-maxage=30'},
  });
}
