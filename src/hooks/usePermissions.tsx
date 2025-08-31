import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { staff, canSeePrices, canSeeCustomers } = useAuth();

  const filterPriceFromData = (data: any) => {
    if (!data) return data;
    
    if (!canSeePrices()) {
      if (Array.isArray(data)) {
        return data.map(item => {
          const { unit_price, price, total, amount, ...rest } = item;
          return rest;
        });
      } else {
        const { unit_price, price, total, amount, ...rest } = data;
        return rest;
      }
    }
    
    return data;
  };

  const filterCustomerFromData = (data: any) => {
    if (!data) return data;
    
    if (!canSeeCustomers()) {
      if (Array.isArray(data)) {
        return data.map(item => {
          const { customer_id, customer, customer_name, ...rest } = item;
          return rest;
        });
      } else {
        const { customer_id, customer, customer_name, ...rest } = data;
        return rest;
      }
    }
    
    return data;
  };

  const shouldHidePrice = () => !canSeePrices();
  const shouldHideCustomer = () => !canSeeCustomers();

  return {
    filterPriceFromData,
    filterCustomerFromData,
    shouldHidePrice,
    shouldHideCustomer,
    canSeePrices: canSeePrices(),
    canSeeCustomers: canSeeCustomers()
  };
};