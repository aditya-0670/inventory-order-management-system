import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { getApiErrorMessage } from "../api/client";
import Button from "../components/common/Button.jsx";
import Input from "../components/common/Input.jsx";
import Loader from "../components/common/Loader.jsx";
import PhoneNumberInput from "../components/common/PhoneNumberInput.jsx";
import Table from "../components/common/Table.jsx";
import { useToast } from "../components/common/Toast.jsx";
import { useCreateCustomer, useCustomers, useDeleteCustomer } from "../hooks/useCustomers";
import { formatDate } from "../utils/formatDate";
import { validateAndFormatPhoneNumber } from "../utils/phoneNumber";
import { customerSchema, getCustomerFormDefaultValues } from "../utils/validators";

export default function CustomersPage() {
  const { showToast } = useToast();
  const { data: customers = [], isLoading, isError, error } = useCustomers();
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: getCustomerFormDefaultValues(),
  });

  async function onSubmit(values) {
    try {
      const phoneNumber = validateAndFormatPhoneNumber(values.national_phone_number, values.phone_country);
      await createCustomer.mutateAsync({
        full_name: values.full_name,
        email: values.email,
        phone_number: phoneNumber.e164,
      });
      showToast("Customer created");
      reset(getCustomerFormDefaultValues());
    } catch (mutationError) {
      showToast(getApiErrorMessage(mutationError), "error");
    }
  }

  async function handleDelete(customer) {
    if (!window.confirm(`Delete ${customer.full_name}?`)) {
      return;
    }

    try {
      await deleteCustomer.mutateAsync(customer.id);
      showToast("Customer deleted");
    } catch (mutationError) {
      showToast(getApiErrorMessage(mutationError), "error");
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Maintain customer records used by order workflows.</p>
        </div>
      </div>

      <section className="surface">
        <div className="section-header">
          <h2>Add Customer</h2>
        </div>
        <form className="form-grid" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input label="Full name" id="customer-name" error={errors.full_name?.message} {...register("full_name")} />
          <Input label="Email" id="customer-email" type="email" error={errors.email?.message} {...register("email")} />
          <PhoneNumberInput control={control} />
          <div className="form-actions">
            <Button type="submit" disabled={isSubmitting || createCustomer.isPending}>
              Add customer
            </Button>
          </div>
        </form>
      </section>

      <section className="surface">
        <div className="section-header">
          <h2>Customer List</h2>
        </div>
        {isLoading ? <Loader label="Loading customers..." /> : null}
        {isError ? <p className="notice error">{getApiErrorMessage(error)}</p> : null}
        {!isLoading && !isError ? (
          <Table
            columns={[
              {
                key: "full_name",
                header: "Name",
                render: (customer) => (
                  <Link className="text-link" to={`/customers/${customer.id}`}>
                    {customer.full_name}
                  </Link>
                ),
              },
              { key: "email", header: "Email" },
              { key: "phone_number", header: "Phone" },
              { key: "created_at", header: "Created", render: (customer) => formatDate(customer.created_at) },
              {
                key: "actions",
                header: "Actions",
                render: (customer) => (
                  <div className="row-actions">
                    <Link className="button button-ghost" to={`/customers/${customer.id}`}>
                      View
                    </Link>
                    <Button variant="danger" onClick={() => handleDelete(customer)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={customers}
            emptyMessage="No customers yet"
          />
        ) : null}
      </section>
    </div>
  );
}
