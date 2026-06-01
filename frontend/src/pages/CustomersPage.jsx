import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Eye, Mail, Plus, Search, Trash2, UserRound } from "lucide-react";

import { getApiErrorMessage } from "../api/client";
import Button from "../components/common/Button.jsx";
import ErrorState from "../components/common/ErrorState.jsx";
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
  const [searchTerm, setSearchTerm] = useState("");
  const { showToast } = useToast();
  const { data: customers = [], isLoading, isError, error, refetch } = useCustomers();
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
  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) =>
      [customer.full_name, customer.email, customer.phone_number].some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }, [customers, searchTerm]);

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
        <a className="button button-secondary" href="#customer-form">
          <Plus aria-hidden="true" size={16} strokeWidth={2.3} />
          Add Customer
        </a>
      </div>

      <section className="surface" id="customer-form">
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
          <span className="section-meta">{customers.length === 1 ? "1 customer" : `${customers.length} customers`}</span>
        </div>
        <div className="table-toolbar">
          <label className="search-field" htmlFor="customers-search">
            <Search aria-hidden="true" size={16} strokeWidth={2.3} />
            <span className="sr-only">Search customers</span>
            <input
              id="customers-search"
              className="input"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, or phone"
              type="search"
              value={searchTerm}
            />
          </label>
          <Button type="button" variant="ghost" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
        {isLoading ? <Loader label="Loading customers..." /> : null}
        {isError ? <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} /> : null}
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
              {
                key: "email",
                header: "Email",
                render: (customer) => (
                  <a className="table-inline-link" href={`mailto:${customer.email}`}>
                    <Mail aria-hidden="true" size={15} strokeWidth={2.3} />
                    {customer.email}
                  </a>
                ),
              },
              {
                key: "phone_number",
                header: "Phone",
                render: (customer) => (
                  <span className="table-inline-link table-inline-muted">
                    <UserRound aria-hidden="true" size={15} strokeWidth={2.3} />
                    {customer.phone_number}
                  </span>
                ),
              },
              { key: "created_at", header: "Created", render: (customer) => formatDate(customer.created_at) },
              {
                key: "actions",
                header: "Actions",
                render: (customer) => (
                  <div className="row-actions">
                    <Link className="button button-ghost" to={`/customers/${customer.id}`}>
                      <Eye aria-hidden="true" size={16} strokeWidth={2.3} />
                      View
                    </Link>
                    <Button variant="danger" icon={Trash2} onClick={() => handleDelete(customer)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={filteredCustomers}
            emptyMessage={searchTerm ? "No customers match your search" : "No customers yet. Add a customer to create orders."}
          />
        ) : null}
      </section>
    </div>
  );
}
