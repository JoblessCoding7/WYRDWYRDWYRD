


export const ORDER_FILTER_FIELDS = {
  NAME: 'name',
  CONFIRMATION_NUMBER: 'confirmation_number',
} as const;




export interface OrderFilterParams {

  name?: string;

  confirmationNumber?: string;
}







function sanitizeFilterValue(value: string): string {


  return value.replace(/[^a-zA-Z0-9_\-]/g, '');
}









export function buildOrderSearchQuery(
  filters: OrderFilterParams,
): string | undefined {
  const queryParts: string[] = [];

  if (filters.name) {

    const cleanName = filters.name.replace(/^#/, '').trim();
    const sanitizedName = sanitizeFilterValue(cleanName);
    if (sanitizedName) {
      queryParts.push(`name:${sanitizedName}`);
    }
  }

  if (filters.confirmationNumber) {
    const cleanConfirmation = filters.confirmationNumber.trim();
    const sanitizedConfirmation = sanitizeFilterValue(cleanConfirmation);
    if (sanitizedConfirmation) {
      queryParts.push(`confirmation_number:${sanitizedConfirmation}`);
    }
  }

  return queryParts.length > 0 ? queryParts.join(' AND ') : undefined;
}









export function parseOrderFilters(
  searchParams: URLSearchParams,
): OrderFilterParams {
  const filters: OrderFilterParams = {};

  const name = searchParams.get(ORDER_FILTER_FIELDS.NAME);
  if (name) {
    filters.name = name;
  }

  const confirmationNumber = searchParams.get(
    ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER,
  );
  if (confirmationNumber) {
    filters.confirmationNumber = confirmationNumber;
  }

  return filters;
}
