import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Save, Trash2, UserRound } from "lucide-react";

import { getApiErrorMessage } from "../api/client";
import Button from "../components/common/Button.jsx";
import Input from "../components/common/Input.jsx";
import Loader from "../components/common/Loader.jsx";
import PhoneNumberInput from "../components/common/PhoneNumberInput.jsx";
import { useToast } from "../components/common/Toast.jsx";
import { useCustomer, useDeleteCustomer, useUpdateCustomer } from "../hooks/useCustomers";
import { formatDate } from "../utils/formatDate";
import {
  getPhoneFormValuesFromE164,
  validateAndFormatPhoneNumber,
} from "../utils/phoneNumber";
import { customerSchema, getCustomerFormDefaultValues } from "../utils/validators";

export default function CustomerDetailsPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: customer, isLoading, isError, error } = useCustomer(customerId);
  const updateCustomer = useUpdateCustomer();
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

  useEffect(() => {
    if (customer) {
      reset({
        full_name: customer.full_name,
        email: customer.email,
        ...getPhoneFormValuesFromE164(customer.phone_number),
      });
    }
  }, [customer, reset]);

  async function onSubmit(values) {
    try {
      const phoneNumber = validateAndFormatPhoneNumber(values.national_phone_number, values.phone_country);
      await updateCustomer.mutateAsync({
        customerId: customer.id,
        payload: {
          full_name: values.full_name,
          email: values.email,
          phone_number: phoneNumber.e164,
        },
      });
      showToast("Customer updated");
    } catch (mutationError) {
      showToast(getApiErrorMessage(mutationError), "error");
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${customer.full_name}?`)) {
      return;
    }

    try {
      await deleteCustomer.mutateAsync(customer.id);
      showToast("Customer deleted");
      navigate("/customers");
    } catch (mutationError) {
      showToast(getApiErrorMessage(mutationError), "error");
    }
  }

  if (isLoading) {
    return <Loader label="Loading customer details..." />;
  }

  if (isError) {
    return <p className="notice error">{getApiErrorMessage(error)}</p>;
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <Link className="text-link" to="/customers">
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.3} />
            Back to customers
          </Link>
          <h1>{customer.full_name}</h1>
          <p>{customer.email}</p>
        </div>
        <Button variant="danger" icon={Trash2} onClick={handleDelete} disabled={deleteCustomer.isPending}>
          Delete customer
        </Button>
      </div>

      <section className="surface">
        <div className="section-header">
          <h2>Customer Details</h2>
        </div>
        <dl className="details-list">
          <div>
            <dt>ID</dt>
            <dd>{customer.id}</dd>
          </div>
          <div>
            <dt>Full name</dt>
            <dd className="detail-inline">
              <UserRound aria-hidden="true" size={16} strokeWidth={2.3} />
              {customer.full_name}
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <a className="text-link" href={`mailto:${customer.email}`}>
                <Mail aria-hidden="true" size={16} strokeWidth={2.3} />
                {customer.email}
              </a>
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd className="detail-inline">
              <Phone aria-hidden="true" size={16} strokeWidth={2.3} />
              {customer.phone_number}
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(customer.created_at)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDate(customer.updated_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="surface">
        <div className="section-header">
          <h2>Update Customer</h2>
        </div>
        <form className="form-grid" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input label="Full name" id="customer-detail-name" error={errors.full_name?.message} {...register("full_name")} />
          <Input label="Email" id="customer-detail-email" type="email" error={errors.email?.message} {...register("email")} />
          <PhoneNumberInput control={control} />
          <div className="form-actions">
            <Button type="submit" icon={Save} disabled={isSubmitting || updateCustomer.isPending}>
              Update customer
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
